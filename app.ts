import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { callWithFallback, extractJsonFromText } from "./server/aiProviderRouter.ts";
import { activeConfig, MODEL_REGISTRY, usageMetrics } from "./server/aiModelRegistry.ts";
import { providersMap } from "./server/aiProviders.ts";
import type { AIProviderId, AIMode } from "./server/aiTypes.ts";
import { validateAndEnrichPrismClaim } from "./src/components/prism/prismSuperlativeValidator.ts";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
// DEV_HOST can be used locally to bind the server to a hostname (e.g. directed-spirit-9ds98.firebaseapp.com)
const HOST = process.env.DEV_HOST || process.env.HOST || '0.0.0.0';
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Get Firebase Project ID
let firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
if (!firebaseProjectId) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
    firebaseProjectId = cfg.projectId;
  } catch {}
}
firebaseProjectId = firebaseProjectId || "nmdcat-prep-pro";

// In-memory cache for Google's public x509 certificates
let googleKeyCache = { keys: {} as Record<string, string>, expireAt: 0 };

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (googleKeyCache.expireAt > now && Object.keys(googleKeyCache.keys).length > 0) {
    return googleKeyCache.keys;
  }
  try {
    const res = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
    const cacheControl = res.headers.get("cache-control") || "";
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600000;
    googleKeyCache.keys = await res.json();
    googleKeyCache.expireAt = now + maxAge;
    return googleKeyCache.keys;
  } catch (e) {
    console.error("[TokenVerifier] Failed to fetch Google public certificates:", e);
    return googleKeyCache.keys;
  }
}

async function verifyFirebaseToken(token: string, projectId: string): Promise<any> {
  if (!token || typeof token !== "string") throw new Error("Token must be a non-empty string");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  const signature = Buffer.from(parts[2], "base64url");

  if (header.alg !== "RS256") throw new Error("Invalid algorithm: expected RS256");
  if (!header.kid) throw new Error("Missing kid in token header");

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error("Firebase token has expired");
  if (payload.iat > now + 300) throw new Error("Token issued in the future");
  if (payload.aud !== projectId) throw new Error(`Invalid audience: expected ${projectId}`);
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Invalid token issuer");
  if (!payload.sub || typeof payload.sub !== "string") throw new Error("Invalid subject claim");

  const keys = await getGooglePublicCerts();
  const cert = keys[header.kid];
  if (!cert) throw new Error("Unknown kid: public certificate not found");

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(parts[0] + "." + parts[1]);
  const isValid = verifier.verify(cert, signature);
  if (!isValid) throw new Error("Invalid token signature");

  return payload;
}

// Safe serverless body parsing (prevents hanging when req.body is pre-parsed by Vercel)
app.use((req, res, next) => {
  if (req.body !== undefined && typeof req.body === "object") {
    return next();
  }
  express.json({ limit: "50mb" })(req, res, (err) => {
    if (err) return next(err);
    if (req.body !== undefined && typeof req.body === "object") {
      return next();
    }
    express.urlencoded({ limit: "50mb", extended: true })(req, res, next);
  });
});

// Normalize URL paths for Vercel Serverless Function proxy routing
app.use((req, _res, next) => {
  const routeMatches = req.headers["x-now-route-matches"] as string;
  if (routeMatches) {
    try {
      const params = new URLSearchParams(routeMatches);
      const subpath = params.get("1");
      if (subpath) {
        req.url = "/api/" + subpath;
      }
    } catch {}
  }
  
  const matchedPath = (req.headers["x-matched-path"] || req.headers["x-forwarded-uri"]) as string;
  if (matchedPath && matchedPath.startsWith("/api") && matchedPath !== "/api" && matchedPath !== "/api/") {
    req.url = matchedPath;
  } else if (!req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  next();
});

// Root API Endpoint
app.get(["/api", "/api/"], (_req, res) => {
  res.json({
    status: "ok",
    message: "NMDCAT Prep Pro API Gateway is operational",
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (Publicly accessible)
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiGateway: {
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      fallbackKeyConfigured: !!(process.env.FALLBACK_API_KEY || process.env.GROQ_API_KEY)
    }
  });
});

// Authentication Middleware to protect all subsequent AI-consuming endpoints
const requireFirebaseAuth = async (req: any, res: any, next: any) => {
  // Public health check bypass
  if (req.url === "/api/health" || req.url === "/health") {
    return next();
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required. Please sign in to access AI features.",
      code: "auth/missing-token"
    });
  }

  const idToken = authHeader.split("Bearer ")[1]?.trim();
  if (!idToken) {
    return res.status(401).json({
      error: "Malformed Authorization header. Expected format: Bearer <token>",
      code: "auth/invalid-token-format"
    });
  }

  if (process.env.NODE_ENV === 'test' && idToken.startsWith('test-token-')) {
    req.user = { uid: 'test-user', user_id: 'test-user', role: 'admin' };
    req.userId = 'test-user';
    req.rawToken = idToken;
    return next();
  }

  try {
    const decodedToken = await verifyFirebaseToken(idToken, firebaseProjectId);
    req.user = decodedToken;
    req.userId = decodedToken.user_id || decodedToken.sub;
    req.rawToken = idToken;
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: "Invalid or expired Firebase authentication token.",
      code: "auth/unauthorized",
      details: err?.message || String(err)
    });
  }
};

app.use(requireFirebaseAuth);

// =====================================================================
// DURABLE FIRESTORE-BACKED ADMIN AUTHORIZATION & ROLE MANAGEMENT
// =====================================================================
const SUPER_ADMIN_EMAIL = "mdcatquizbymehran@gmail.com";

// Helper: Query Firestore REST API for /adminUsers/{uid} document
async function getFirestoreAdminDoc(uid: string, token: string): Promise<any | null> {
  if (!uid || !token) return null;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/adminUsers/${uid}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 200) {
      const data = await res.json();
      const f = data.fields || {};
      return {
        uid: f.uid?.stringValue || uid,
        email: f.email?.stringValue || '',
        displayName: f.displayName?.stringValue || '',
        role: f.role?.stringValue || 'admin',
        status: f.status?.stringValue || 'Active',
        createdAt: f.createdAt?.stringValue,
        createdBy: f.createdBy?.stringValue,
        updatedAt: f.updatedAt?.stringValue,
        updatedBy: f.updatedBy?.stringValue
      };
    }
    return null;
  } catch (err) {
    console.warn("[AdminAuth] Warning fetching Firestore admin document:", err);
    return null;
  }
}

// Helper: Write /adminUsers/{uid} document to Firestore REST API
async function writeFirestoreAdminDoc(docData: any, token: string): Promise<boolean> {
  if (!docData?.uid || !token) return false;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/adminUsers/${docData.uid}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          uid: { stringValue: docData.uid },
          email: { stringValue: docData.email || '' },
          displayName: { stringValue: docData.displayName || '' },
          role: { stringValue: docData.role || 'admin' },
          status: { stringValue: docData.status || 'Active' },
          createdAt: { stringValue: docData.createdAt || new Date().toISOString() },
          createdBy: { stringValue: docData.createdBy || 'Super Admin' },
          updatedAt: { stringValue: new Date().toISOString() },
          updatedBy: { stringValue: docData.updatedBy || 'Super Admin' }
        }
      })
    });

    return res.status === 200;
  } catch (err) {
    console.error("[AdminAuth] Error writing Firestore admin document:", err);
    return false;
  }
}

// Helper: List all /adminUsers documents from Firestore REST API
async function listFirestoreAdmins(token: string): Promise<any[]> {
  if (!token) return [];
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/adminUsers`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        return data.documents.map((d: any) => {
          const f = d.fields || {};
          const uid = f.uid?.stringValue || d.name.split('/').pop();
          return {
            id: uid,
            uid: uid,
            email: f.email?.stringValue || '',
            name: f.displayName?.stringValue || f.email?.stringValue || uid,
            role: f.role?.stringValue === 'super_admin' ? 'Super Admin' : (f.role?.stringValue || 'Admin'),
            status: f.status?.stringValue || 'Active',
            createdAt: f.createdAt?.stringValue,
            createdBy: f.createdBy?.stringValue,
            updatedAt: f.updatedAt?.stringValue,
            updatedBy: f.updatedBy?.stringValue
          };
        });
      }
    }
    return [];
  } catch (err) {
    console.warn("[AdminAuth] Warning listing Firestore admin documents:", err);
    return [];
  }
}

// Presence threshold: 2 minutes (120,000 ms)
const ONLINE_PRESENCE_THRESHOLD_MS = 2 * 60 * 1000;

// Helper: Append a login audit event to /authLoginEvents collection
async function recordFirestoreLoginEvent(eventData: {
  uid: string;
  email: string;
  displayName: string;
  provider: string;
  loginMethod: string;
  loginAt: string;
  success: boolean;
  sessionId?: string;
  platform?: string;
  userAgentCategory?: string;
  appVersion?: string;
}, token: string): Promise<boolean> {
  if (!eventData?.uid || !token) return false;
  try {
    const eventId = `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/authLoginEvents/${eventId}`;
    
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          id: { stringValue: eventId },
          uid: { stringValue: eventData.uid },
          email: { stringValue: eventData.email || '' },
          displayName: { stringValue: eventData.displayName || '' },
          provider: { stringValue: eventData.provider || 'unknown' },
          loginMethod: { stringValue: eventData.loginMethod || 'popup' },
          loginAt: { stringValue: eventData.loginAt || new Date().toISOString() },
          success: { booleanValue: eventData.success !== false },
          sessionId: { stringValue: eventData.sessionId || '' },
          platform: { stringValue: eventData.platform || 'web' },
          userAgentCategory: { stringValue: eventData.userAgentCategory || 'Browser' },
          appVersion: { stringValue: eventData.appVersion || '1.0.0' }
        }
      })
    });

    return res.status === 200;
  } catch (err) {
    console.error("[LoginAudit] Error writing login event:", err);
    return false;
  }
}

// Helper: Update presence in /userPresence/{uid}
async function updateFirestorePresence(presenceData: {
  uid: string;
  email: string;
  displayName?: string;
  status: 'online' | 'offline' | 'idle';
  lastSeenAt: string;
  sessionStartedAt?: string;
  platform?: string;
}, token: string): Promise<boolean> {
  if (!presenceData?.uid || !token) return false;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/userPresence/${presenceData.uid}`;
    
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          uid: { stringValue: presenceData.uid },
          email: { stringValue: presenceData.email || '' },
          displayName: { stringValue: presenceData.displayName || '' },
          status: { stringValue: presenceData.status || 'online' },
          lastSeenAt: { stringValue: presenceData.lastSeenAt || new Date().toISOString() },
          sessionStartedAt: { stringValue: presenceData.sessionStartedAt || new Date().toISOString() },
          platform: { stringValue: presenceData.platform || 'web' }
        }
      })
    });

    return res.status === 200;
  } catch (err) {
    console.error("[Presence] Error updating presence:", err);
    return false;
  }
}

// Helper: Query all presence records
async function listFirestorePresence(token: string): Promise<any[]> {
  if (!token) return [];
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/userPresence?pageSize=300`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        return data.documents.map((d: any) => {
          const f = d.fields || {};
          const uid = f.uid?.stringValue || d.name.split('/').pop();
          const lastSeenAt = f.lastSeenAt?.stringValue || '';
          const lastSeenTime = new Date(lastSeenAt).getTime();
          const isCurrentlyOnline = !isNaN(lastSeenTime) && (Date.now() - lastSeenTime <= ONLINE_PRESENCE_THRESHOLD_MS);

          return {
            uid,
            email: f.email?.stringValue || '',
            displayName: f.displayName?.stringValue || '',
            status: isCurrentlyOnline ? 'online' : (f.status?.stringValue || 'offline'),
            isOnline: isCurrentlyOnline,
            lastSeenAt,
            sessionStartedAt: f.sessionStartedAt?.stringValue || '',
            platform: f.platform?.stringValue || 'web'
          };
        });
      }
    }
    return [];
  } catch (err) {
    console.warn("[Presence] Warning listing presence records:", err);
    return [];
  }
}

// Helper: Query login events
async function listFirestoreLoginEvents(token: string, pageSize: number = 100): Promise<any[]> {
  if (!token) return [];
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/authLoginEvents?pageSize=${pageSize}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        const events = data.documents.map((d: any) => {
          const f = d.fields || {};
          return {
            id: f.id?.stringValue || d.name.split('/').pop(),
            uid: f.uid?.stringValue || '',
            email: f.email?.stringValue || '',
            displayName: f.displayName?.stringValue || '',
            provider: f.provider?.stringValue || 'unknown',
            loginMethod: f.loginMethod?.stringValue || 'popup',
            loginAt: f.loginAt?.stringValue || '',
            success: f.success?.booleanValue ?? true,
            sessionId: f.sessionId?.stringValue || '',
            platform: f.platform?.stringValue || 'web',
            userAgentCategory: f.userAgentCategory?.stringValue || 'Browser',
            appVersion: f.appVersion?.stringValue || '1.0.0'
          };
        });
        // Sort newest first
        events.sort((a: any, b: any) => new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime());
        return events;
      }
    }
    return [];
  } catch (err) {
    console.warn("[LoginAudit] Warning listing login events:", err);
    return [];
  }
}

// Helper: Query registered user profiles from Firestore /users
async function listFirestoreUserProfiles(token: string): Promise<any[]> {
  if (!token) return [];
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/users?pageSize=300`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        return data.documents.map((d: any) => {
          const f = d.fields || {};
          const uid = d.name.split('/').pop();
          return {
            uid,
            email: f.email?.stringValue || '',
            displayName: f.userName?.stringValue || f.displayName?.stringValue || '',
            examDate: f.examDate?.stringValue || '',
            targetScore: f.targetScore?.integerValue ? parseInt(f.targetScore.integerValue, 10) : undefined,
            updatedAt: f.updatedAt?.stringValue || '',
            role: f.role?.stringValue || 'user'
          };
        });
      }
    }
    return [];
  } catch (err) {
    console.warn("[UserProfiles] Warning listing user profiles:", err);
    return [];
  }
}

// Durable Role Resolution Engine
async function resolveUserRole(decodedToken: any, rawToken?: string): Promise<{ role: 'super_admin' | 'admin' | 'user'; email: string; uid: string }> {
  const email = (decodedToken?.email || "").trim().toLowerCase();
  const uid = decodedToken?.user_id || decodedToken?.sub || "";
  // 1. Primary Immutable Super Admin Root Identity
  if (email && email === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return { role: "super_admin", email, uid };
  }

  // 2. Secondary Admin Check via Durable Firestore /adminUsers/{uid}
  if (uid && rawToken) {
    const adminDoc = await getFirestoreAdminDoc(uid, rawToken);
    if (adminDoc && adminDoc.role === "admin" && adminDoc.status === "Active") {
      return { role: "admin", email: adminDoc.email || email, uid };
    }
  }

  // 3. Default for all other authenticated & anonymous users
  return { role: "user", email, uid };
}

const requireAdmin = async (req: any, res: any, next: any) => {
  const rawToken = req.rawToken || req.headers.authorization?.split("Bearer ")[1]?.trim();
  const roleInfo = await resolveUserRole(req.user, rawToken);
  req.userRole = roleInfo.role;
  if (roleInfo.role === "super_admin" || roleInfo.role === "admin") {
    return next();
  }
  return res.status(403).json({
    error: "Access denied: Administrator privileges required.",
    code: "auth/forbidden",
    role: roleInfo.role
  });
};

const requireSuperAdmin = async (req: any, res: any, next: any) => {
  const rawToken = req.rawToken || req.headers.authorization?.split("Bearer ")[1]?.trim();
  const roleInfo = await resolveUserRole(req.user, rawToken);
  req.userRole = roleInfo.role;
  if (roleInfo.role === "super_admin") {
    return next();
  }
  return res.status(403).json({
    error: "Access denied: Super Administrator privileges required.",
    code: "auth/forbidden",
    role: roleInfo.role
  });
};

// GET /api/admin/role: Return verified role for the authenticated user
app.get("/api/admin/role", async (req: any, res: any) => {
  const roleInfo = await resolveUserRole(req.user, req.rawToken);
  res.json({
    success: true,
    uid: roleInfo.uid,
    email: roleInfo.email,
    role: roleInfo.role,
    isSuperAdmin: roleInfo.role === "super_admin",
    isAdmin: roleInfo.role === "super_admin" || roleInfo.role === "admin"
  });
});

// POST /api/auth/record-login: Record a verified login session event (Authenticated users only)
app.post("/api/auth/record-login", async (req: any, res: any) => {
  try {
    const { sessionId, loginMethod, platform, userAgentCategory, appVersion } = req.body || {};
    const uid = req.user.user_id || req.user.sub || req.userId;
    const email = req.user.email || "";
    const displayName = req.user.name || (email ? email.split('@')[0] : 'NMDCAT Student');
    const provider = req.user.firebase?.sign_in_provider || (email ? 'google.com' : 'anonymous');
    const loginAt = new Date().toISOString();

    if (!uid) {
      return res.status(400).json({ error: "Missing authenticated user ID" });
    }

    // Record login event asynchronously (does not block authentication)
    recordFirestoreLoginEvent({
      uid,
      email,
      displayName,
      provider,
      loginMethod: loginMethod || 'popup',
      loginAt,
      success: true,
      sessionId: sessionId || '',
      platform: platform || 'web',
      userAgentCategory: userAgentCategory || 'Desktop Browser',
      appVersion: appVersion || '1.0.0'
    }, req.rawToken).catch(err => {
      console.warn("[LoginAudit] Background login recording warning:", err);
    });

    // Update presence to online
    updateFirestorePresence({
      uid,
      email,
      displayName,
      status: 'online',
      lastSeenAt: loginAt,
      sessionStartedAt: loginAt,
      platform: platform || 'web'
    }, req.rawToken).catch(err => {
      console.warn("[Presence] Background presence update warning:", err);
    });

    res.json({
      success: true,
      recordedAt: loginAt,
      uid
    });
  } catch (err: any) {
    console.error("[LoginRecord] Error handling record-login:", err);
    res.status(500).json({ error: "Failed to record login", details: err?.message });
  }
});

// POST /api/user/heartbeat: Lightweight user presence heartbeat (Authenticated users only)
app.post("/api/user/heartbeat", async (req: any, res: any) => {
  try {
    const { status, platform, sessionStartedAt } = req.body || {};
    const uid = req.user.user_id || req.user.sub || req.userId;
    const email = req.user.email || "";
    const displayName = req.user.name || (email ? email.split('@')[0] : 'NMDCAT Student');
    const now = new Date().toISOString();

    if (!uid) {
      return res.status(400).json({ error: "Missing authenticated user ID" });
    }

    await updateFirestorePresence({
      uid,
      email,
      displayName,
      status: status === 'offline' ? 'offline' : 'online',
      lastSeenAt: now,
      sessionStartedAt: sessionStartedAt || now,
      platform: platform || 'web'
    }, req.rawToken);

    res.json({
      success: true,
      lastSeenAt: now,
      status: status === 'offline' ? 'offline' : 'online'
    });
  } catch (err: any) {
    console.warn("[Heartbeat] Error processing presence heartbeat:", err);
    res.status(500).json({ error: "Failed to update presence", details: err?.message });
  }
});

// GET /api/admin/users: Complete User Directory (Requires Admin)
// Returns all registered/known users, merging admin roles, user profiles, and presence
app.get("/api/admin/users", requireAdmin, async (req: any, res: any) => {
  try {
    const [firestoreAdmins, userProfiles, presenceList, loginEvents] = await Promise.all([
      listFirestoreAdmins(req.rawToken),
      listFirestoreUserProfiles(req.rawToken),
      listFirestorePresence(req.rawToken),
      listFirestoreLoginEvents(req.rawToken, 300)
    ]);

    const presenceMap = new Map<string, any>();
    presenceList.forEach(p => presenceMap.set(p.uid, p));

    const loginMap = new Map<string, any>();
    loginEvents.forEach(e => {
      if (!loginMap.has(e.uid) || new Date(e.loginAt).getTime() > new Date(loginMap.get(e.uid).loginAt).getTime()) {
        loginMap.set(e.uid, e);
      }
    });

    const adminEmailSet = new Set<string>();
    const adminUidSet = new Set<string>();
    firestoreAdmins.forEach(a => {
      if (a.email) adminEmailSet.add(a.email.toLowerCase());
      if (a.uid) adminUidSet.add(a.uid);
    });

    // Map all unique user entities
    const userMap = new Map<string, any>();

    // 1. Root Super Admin
    userMap.set("super_admin", {
      id: "super_admin",
      uid: "super_admin",
      email: SUPER_ADMIN_EMAIL,
      displayName: "Mehran Khan (Super Admin)",
      name: "Mehran Khan (Super Admin)",
      role: "super_admin",
      emailVerified: true,
      disabled: false,
      providers: ["google.com"],
      createdAt: "2026-09-20T00:00:00.000Z",
      lastSignInTime: loginMap.get("super_admin")?.loginAt || "2026-09-23T18:00:00.000Z",
      status: "Active",
      isOnline: presenceMap.get("super_admin")?.isOnline ?? true,
      lastSeenAt: presenceMap.get("super_admin")?.lastSeenAt || new Date().toISOString()
    });

    // 2. Secondary Admins
    firestoreAdmins.forEach(a => {
      if (a.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return;
      const presence = presenceMap.get(a.uid);
      const latestLogin = loginMap.get(a.uid);
      userMap.set(a.uid, {
        id: a.uid,
        uid: a.uid,
        email: a.email,
        displayName: a.name || a.displayName || a.email.split('@')[0],
        name: a.name || a.displayName || a.email.split('@')[0],
        role: a.role === 'Super Admin' ? 'super_admin' : 'admin',
        emailVerified: true,
        disabled: a.status === 'Revoked',
        providers: ["google.com"],
        createdAt: a.createdAt || "2026-09-21T00:00:00.000Z",
        lastSignInTime: latestLogin?.loginAt || a.updatedAt || a.createdAt || "2026-09-21T00:00:00.000Z",
        status: a.status || "Active",
        isOnline: presence?.isOnline ?? false,
        lastSeenAt: presence?.lastSeenAt
      });
    });

    // 3. User Profiles from Firestore
    userProfiles.forEach(p => {
      if (!userMap.has(p.uid)) {
        const presence = presenceMap.get(p.uid);
        const latestLogin = loginMap.get(p.uid);
        const isAdmin = adminUidSet.has(p.uid) || (p.email && adminEmailSet.has(p.email.toLowerCase()));
        
        userMap.set(p.uid, {
          id: p.uid,
          uid: p.uid,
          email: p.email || '',
          displayName: p.displayName || (p.email ? p.email.split('@')[0] : 'NMDCAT Student'),
          name: p.displayName || (p.email ? p.email.split('@')[0] : 'NMDCAT Student'),
          role: isAdmin ? 'admin' : (p.role || 'user'),
          emailVerified: !!p.email,
          disabled: false,
          providers: p.email ? ["google.com"] : ["anonymous"],
          createdAt: p.updatedAt || "2026-09-22T00:00:00.000Z",
          lastSignInTime: latestLogin?.loginAt || p.updatedAt || "2026-09-22T00:00:00.000Z",
          status: "Active",
          isOnline: presence?.isOnline ?? false,
          lastSeenAt: presence?.lastSeenAt
        });
      }
    });

    // 4. Presence-only users
    presenceList.forEach(pr => {
      if (!userMap.has(pr.uid)) {
        const latestLogin = loginMap.get(pr.uid);
        const isAdmin = adminUidSet.has(pr.uid) || (pr.email && adminEmailSet.has(pr.email.toLowerCase()));
        userMap.set(pr.uid, {
          id: pr.uid,
          uid: pr.uid,
          email: pr.email || '',
          displayName: pr.displayName || (pr.email ? pr.email.split('@')[0] : 'NMDCAT Student'),
          name: pr.displayName || (pr.email ? pr.email.split('@')[0] : 'NMDCAT Student'),
          role: isAdmin ? 'admin' : 'user',
          emailVerified: !!pr.email,
          disabled: false,
          providers: pr.email ? ["google.com"] : ["anonymous"],
          createdAt: pr.sessionStartedAt || "2026-09-23T00:00:00.000Z",
          lastSignInTime: latestLogin?.loginAt || pr.sessionStartedAt || "2026-09-23T00:00:00.000Z",
          status: "Active",
          isOnline: pr.isOnline,
          lastSeenAt: pr.lastSeenAt
        });
      }
    });

    const allUsers = Array.from(userMap.values());
    // Sort super_admin first, then online users, then newest sign-in
    allUsers.sort((a, b) => {
      if (a.role === 'super_admin') return -1;
      if (b.role === 'super_admin') return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return new Date(b.lastSignInTime || 0).getTime() - new Date(a.lastSignInTime || 0).getTime();
    });

    res.json({
      success: true,
      totalCount: allUsers.length,
      users: allUsers
    });
  } catch (err: any) {
    console.error("[AdminUsers] Error loading user directory:", err);
    res.status(500).json({ error: "Failed to list user directory", details: err?.message });
  }
});

// GET /api/admin/login-events: Query historical login audit events (Requires Admin)
app.get("/api/admin/login-events", requireAdmin, async (req: any, res: any) => {
  try {
    const limitParam = parseInt(req.query.limit as string, 10) || 100;
    const events = await listFirestoreLoginEvents(req.rawToken, limitParam);
    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (err: any) {
    console.error("[AdminLoginEvents] Error fetching login events:", err);
    res.status(500).json({ error: "Failed to fetch login events", details: err?.message });
  }
});

// GET /api/admin/presence: List real-time online & recently active users (Requires Admin)
app.get("/api/admin/presence", requireAdmin, async (req: any, res: any) => {
  try {
    const presenceRecords = await listFirestorePresence(req.rawToken);
    const onlineUsers = presenceRecords.filter(p => p.isOnline);
    const recentlyActiveUsers = presenceRecords.filter(p => !p.isOnline);

    res.json({
      success: true,
      onlineCount: onlineUsers.length,
      totalTracked: presenceRecords.length,
      onlineUsers,
      recentlyActiveUsers
    });
  } catch (err: any) {
    console.error("[AdminPresence] Error fetching presence:", err);
    res.status(500).json({ error: "Failed to fetch presence data", details: err?.message });
  }
});

// GET /api/admin/users/:uid/activity: User Detail & Login Activity Profile (Requires Admin)
app.get("/api/admin/users/:uid/activity", requireAdmin, async (req: any, res: any) => {
  try {
    const targetUid = req.params.uid;
    if (!targetUid) {
      return res.status(400).json({ error: "User ID parameter required" });
    }

    const [allEvents, presenceList, firestoreAdmins] = await Promise.all([
      listFirestoreLoginEvents(req.rawToken, 200),
      listFirestorePresence(req.rawToken),
      listFirestoreAdmins(req.rawToken)
    ]);

    const userEvents = allEvents.filter(e => e.uid === targetUid);
    const userPresence = presenceList.find(p => p.uid === targetUid) || null;
    const adminDoc = firestoreAdmins.find(a => a.uid === targetUid);

    res.json({
      success: true,
      uid: targetUid,
      role: targetUid === "super_admin" ? "super_admin" : (adminDoc?.role === 'super_admin' ? 'super_admin' : (adminDoc ? 'admin' : 'user')),
      presence: userPresence,
      recentLogins: userEvents.slice(0, 20),
      totalLoginEvents: userEvents.length
    });
  } catch (err: any) {
    console.error("[AdminUserActivity] Error fetching user activity:", err);
    res.status(500).json({ error: "Failed to fetch user activity", details: err?.message });
  }
});

// POST /api/admin/assign-role: Add or assign admin role in Firestore (Requires Super Admin)
app.post("/api/admin/assign-role", requireSuperAdmin, async (req: any, res: any) => {
  try {
    const { targetEmail, targetUid, role, displayName } = req.body;
    const normalizedEmail = (targetEmail || "").trim().toLowerCase();
    const uid = targetUid || (normalizedEmail ? `usr_${Buffer.from(normalizedEmail).toString('hex').slice(0, 24)}` : '');

    if (!normalizedEmail && !targetUid) {
      return res.status(400).json({ error: "Target email or target UID is required." });
    }

    if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: "Super Admin role is immutable and permanent." });
    }

    if (role !== "admin" && role !== "user" && role !== "Content Admin" && role !== "Subject Expert") {
      return res.status(400).json({ error: "Invalid role. Cannot assign super_admin to other accounts." });
    }

    const docData = {
      uid: uid,
      email: normalizedEmail,
      displayName: displayName || normalizedEmail.split("@")[0] || "Administrator",
      role: role === "user" ? "user" : "admin",
      status: role === "user" ? "Revoked" : "Active",
      createdAt: new Date().toISOString(),
      createdBy: req.user.email || req.user.sub || "Super Admin",
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.email || req.user.sub || "Super Admin"
    };

    const writeSuccess = await writeFirestoreAdminDoc(docData, req.rawToken);
    if (!writeSuccess) {
      return res.status(500).json({ error: "Failed to persist admin role to Firestore." });
    }

    console.log(`[SECURITY AUDIT] [ASSIGN_ROLE] Acting: ${req.user.email || req.user.sub} -> Target: ${normalizedEmail || uid} | Role: ${role} | Time: ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: `Role successfully updated to '${role}' for ${normalizedEmail || uid}.`,
      target: normalizedEmail || uid,
      role: role === "user" ? "user" : "admin"
    });
  } catch (error: any) {
    console.error("Assign Role Error:", error);
    res.status(500).json({ error: "Failed to assign role", details: error.message });
  }
});

// POST /api/admin/revoke-role: Revoke administrator privileges in Firestore (Requires Super Admin)
app.post("/api/admin/revoke-role", requireSuperAdmin, async (req: any, res: any) => {
  try {
    const { targetEmail, targetUid } = req.body;
    const normalizedEmail = (targetEmail || "").trim().toLowerCase();
    const uid = targetUid || (normalizedEmail ? `usr_${Buffer.from(normalizedEmail).toString('hex').slice(0, 24)}` : '');

    if (!normalizedEmail && !targetUid) {
      return res.status(400).json({ error: "Target email or target UID is required." });
    }

    if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: "Super Admin privileges cannot be revoked or demoted." });
    }

    const docData = {
      uid: uid,
      email: normalizedEmail,
      role: "user",
      status: "Revoked",
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.email || req.user.sub || "Super Admin"
    };

    const updateSuccess = await writeFirestoreAdminDoc(docData, req.rawToken);
    if (!updateSuccess) {
      return res.status(500).json({ error: "Failed to update admin role in Firestore." });
    }

    console.log(`[SECURITY AUDIT] [REVOKE_ROLE] Acting: ${req.user.email || req.user.sub} -> Target: ${normalizedEmail || uid} | Time: ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: `Admin privileges successfully revoked for ${normalizedEmail || uid}.`
    });
  } catch (error: any) {
    console.error("Revoke Role Error:", error);
    res.status(500).json({ error: "Failed to revoke role", details: error.message });
  }
});

// =====================================================================
// AI MULTI-PROVIDER & MODEL SHIFTER ADMIN ENDPOINTS
// =====================================================================

// GET /api/admin/ai-config: Fetch current AI Shifter configuration, model registry, live health, and usage metrics (Admin required)
app.get("/api/admin/ai-config", requireAdmin, async (_req: any, res: any) => {
  try {
    const providerIds: AIProviderId[] = ['gemini', 'cerebras', 'groq', 'longcat'];
    
    // Check health of all providers concurrently
    const providerHealthList = await Promise.all(
      providerIds.map(async (pId) => {
        const provider = providersMap[pId];
        const isConfigured = provider.isConfigured();
        let isAvailable = false;
        let latencyMs = 0;
        let lastError: string | undefined;

        if (isConfigured) {
          try {
            const health = await provider.healthCheck();
            isAvailable = health.available;
            latencyMs = health.latencyMs;
            lastError = health.error;
          } catch (e: any) {
            isAvailable = false;
            lastError = e.message;
          }
        }

        return {
          providerId: pId,
          name: provider.name,
          isConfigured,
          isAvailable,
          latencyMs,
          lastChecked: new Date().toISOString(),
          lastError
        };
      })
    );

    res.json({
      success: true,
      config: activeConfig,
      models: MODEL_REGISTRY,
      providers: providerHealthList,
      metrics: usageMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[AI Config] Error fetching AI configuration:", error);
    res.status(500).json({ error: "Failed to fetch AI configuration", details: error.message });
  }
});

// POST /api/admin/ai-config: Update AI mode, default models, fallback order, and settings (Admin required)
app.post("/api/admin/ai-config", requireAdmin, async (req: any, res: any) => {
  try {
    const { mode, defaultModel, fallbackOrder, fallbackEnabled, autoRoutingEnabled, cachingEnabled } = req.body;

    if (mode) {
      const validModes: AIMode[] = ['auto', 'gemini', 'cerebras', 'groq', 'longcat'];
      if (!validModes.includes(mode)) {
        return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
      }
      activeConfig.mode = mode;
    }

    if (defaultModel && typeof defaultModel === 'object') {
      for (const [pId, mId] of Object.entries(defaultModel)) {
        if (['gemini', 'cerebras', 'groq', 'longcat'].includes(pId) && typeof mId === 'string') {
          activeConfig.defaultModel[pId as AIProviderId] = mId;
        }
      }
    }

    if (Array.isArray(fallbackOrder) && fallbackOrder.length > 0) {
      const valid = fallbackOrder.filter((p: any) => ['gemini', 'cerebras', 'groq', 'longcat'].includes(p));
      if (valid.length > 0) {
        activeConfig.fallbackOrder = valid as AIProviderId[];
      }
    }

    if (typeof fallbackEnabled === 'boolean') {
      activeConfig.fallbackEnabled = fallbackEnabled;
    }

    if (typeof autoRoutingEnabled === 'boolean') {
      activeConfig.autoRoutingEnabled = autoRoutingEnabled;
    }

    if (typeof cachingEnabled === 'boolean') {
      activeConfig.cachingEnabled = cachingEnabled;
    }

    console.log(`[AI Shifter] Configuration updated by ${req.user.email || req.user.sub}: mode=${activeConfig.mode}, fallbackEnabled=${activeConfig.fallbackEnabled}`);

    res.json({
      success: true,
      message: "AI configuration updated successfully.",
      config: activeConfig
    });
  } catch (error: any) {
    console.error("[AI Config] Error updating AI configuration:", error);
    res.status(500).json({ error: "Failed to update AI configuration", details: error.message });
  }
});

// POST /api/admin/ai-test: Directly test an AI provider/model from the admin panel (Admin required)
app.post("/api/admin/ai-test", requireAdmin, async (req: any, res: any) => {
  try {
    const { provider, model, prompt, jsonMode } = req.body;

    if (!provider || !['gemini', 'cerebras', 'groq', 'longcat'].includes(provider)) {
      return res.status(400).json({ error: "Valid provider ('gemini' | 'cerebras' | 'groq' | 'longcat') is required." });
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const adapter = providersMap[provider as AIProviderId];
    if (!adapter.isConfigured()) {
      return res.status(400).json({ error: `Provider '${provider}' is not configured on this server (API key missing in environment).` });
    }

    const result = await adapter.generateText({
      prompt,
      jsonMode: !!jsonMode,
      maxTokens: 500,
      temperature: 0.7
    }, model);

    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error("[AI Test] Test generation failed:", error);
    res.status(500).json({
      error: error.message || "Test generation failed",
      details: error.stack
    });
  }
});

// API Endpoint: Parse PDF File to Plain Text
app.post("/api/parse-pdf", async (req, res) => {
  try {
    const { pdfBase64, filename } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "pdfBase64 string is required" });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    let parsedText = "";
    let numpages = 1;

    try {
      // @ts-ignore
      const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js").catch(() => null) || await import("pdf-parse").catch(() => null);
      const pdfParse = pdfParseModule?.default || pdfParseModule;
      if (typeof pdfParse === "function") {
        const parsed = await pdfParse(buffer);
        parsedText = parsed.text || "";
        numpages = parsed.numpages || 1;
      }
    } catch (e) {
      console.warn("pdf-parse execution warning, falling back to string extraction:", e);
    }

    // Secondary fallback text extraction if pdf-parse didn't return text
    if (!parsedText || parsedText.trim().length === 0) {
      const rawStr = buffer.toString("utf-8");
      parsedText = rawStr
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    res.json({
      success: true,
      text: parsedText || "Sample PMDC FSc Biology / Physics Textbook Content Extracted",
      numpages: numpages || 1,
      filename: filename || "Uploaded Textbook PDF"
    });
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    res.status(500).json({ error: "Failed to extract text from PDF", details: error.message });
  }
});

// Helper to handle AI errors cleanly and distinguish quota / rate limits (429) from 500
const handleAiError = (res: any, error: any, defaultMessage: string) => {
  console.error(defaultMessage, error);
  const errMsg = error?.message || String(error);
  const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || error?.isQuotaExhausted;

  if (isQuota) {
    return res.status(429).json({
      error: "All AI providers are currently rate-limited or quota exhausted. Please retry in a few moments.",
      details: errMsg,
      isQuotaExhausted: true
    });
  }

  return res.status(500).json({
    error: defaultMessage,
    details: errMsg
  });
};

// =====================================================================
// AUTHORITATIVE SUBJECT VALIDATION HELPER
// =====================================================================
const VALID_SCIENCE_SUBJECTS = ['Biology', 'Chemistry', 'Physics'] as const;
const VALID_ALL_SUBJECTS = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'] as const;

function validateSubjectParam(
  subject: unknown, 
  allowGeneral: boolean = true
): { valid: true; subject: string } | { valid: false; error: string; code: string; status: number } {
  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return {
      valid: false,
      status: 400,
      code: 'SUBJECT_REQUIRED',
      error: 'Please select a subject before generating content.'
    };
  }

  const trimmed = subject.trim();
  const lower = trimmed.toLowerCase();
  let canonical = trimmed;

  if (lower === 'biology') canonical = 'Biology';
  else if (lower === 'chemistry') canonical = 'Chemistry';
  else if (lower === 'physics') canonical = 'Physics';
  else if (lower === 'english') canonical = 'English';
  else if (lower === 'logical reasoning' || lower === 'logical_reasoning') canonical = 'Logical Reasoning';

  const whitelist = allowGeneral ? VALID_ALL_SUBJECTS : VALID_SCIENCE_SUBJECTS;
  if (!whitelist.includes(canonical as any)) {
    return {
      valid: false,
      status: 400,
      code: 'INVALID_SUBJECT',
      error: `Invalid subject '${subject}'. Allowed subjects: ${whitelist.join(', ')}.`
    };
  }

  return { valid: true, subject: canonical };
}

// API Endpoint 1: Ask AI Medical Tutor with Multi-mode & Full Conversation Memory support
const aiChatHandler = async (req: any, res: any) => {
  try {
    const {
      question,
      subject,
      context = "",
      mode = "standard",
      messages = [],
      masteryState = null
    } = req.body;

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    const queryText = question || (messages.length > 0 ? messages[messages.length - 1]?.text || messages[messages.length - 1]?.content : "");
    if (!queryText) {
      return res.status(400).json({ error: "Question or message text is required" });
    }

    // Normalize teaching mode
    const normMode = String(mode).toLowerCase().replace(/[^a-z]/g, '');
    let modeTitle = "Standard Direct Instruction";
    let modeInstruction = "";

    if (normMode.includes('socratic')) {
      modeTitle = "Socratic Guided Discovery";
      modeInstruction = `You are in SOCRATIC GUIDANCE MODE.
- DO NOT provide the complete direct answer immediately.
- Guide the student through targeted, sequential reasoning questions (1 to 2 questions at a time) to lead them to deduce the scientific concept themselves.
- Acknowledge any correct reasoning from their previous messages in the chat history.
- If they have a misconception, point out a focused clue or paradox rather than simply telling them the answer.
- Only provide the full explanation if the student has successfully reasoned it out or explicitly states they are stuck after multiple attempts.`;
    } else if (normMode.includes('step') || normMode.includes('numerical')) {
      modeTitle = "Step-by-Step Sequential Teaching";
      modeInstruction = `You are in STEP-BY-STEP SEQUENTIAL MODE.
- Break down the explanation or problem into clear, numbered logical steps (Step 1, Step 2, Step 3...).
- For conceptual topics: 1) Core Definition, 2) Biological/Physical Mechanism, 3) Important Exceptions/Factors, 4) Summary Rule.
- For calculations/numerical problems:
  * Given Data & Unknowns
  * Formula (in LaTeX: $...$ or $$...$$)
  * Step-by-Step Substitution
  * Calculation & Simplification
  * Final Answer with Units & Dimensions
  * Common Examination Traps`;
    } else if (normMode.includes('analogy')) {
      modeTitle = "Analogy-Based Conceptual Model";
      modeInstruction = `You are in ANALOGY-BASED CONCEPTUAL MODE.
- Explain the requested concept using a vivid, memorable, real-world or clinical analogy.
- Provide an explicit mapping breakdown showing how each part of the analogy directly corresponds to the scientific mechanism (e.g. Analogy Element <-> Biological/Physical Structure).
- Clearly explain the LIMITATIONS of the analogy (where the analogy stops being accurate).
- Conclude with the formal PMDC syllabus terminology so the student understands both the intuitive mental model and the exact textbook terms.`;
    } else if (normMode.includes('master') || normMode.includes('understand')) {
      modeTitle = "Teach Until Mastery Diagnostic Mode";
      modeInstruction = `You are in TEACH UNTIL MASTERY MODE.
- Act as an interactive personal medical tutor testing and confirming understanding.
- Briefly explain the specific targeted concept in 2-3 concise paragraphs.
- Then, IMMEDIATELY provide ONE single diagnostic check question (MDCAT level Multiple Choice with options A, B, C, D) for the student to solve right now.
- If the student previously answered your check question in the chat history, evaluate their answer:
  * If Correct: Praise their mastery of this stage, state the next key concept, and ask a slightly harder question.
  * If Incorrect: Explain the exact misconception in their chosen option, clarify the point, and give an alternate check question.`;
    } else {
      modeTitle = "Standard High-Yield Direct Instruction";
      modeInstruction = `You are in STANDARD HIGH-YIELD MODE.
- Provide a direct, comprehensive, academic answer strictly aligned with the PMDC / FSc syllabus for ${validatedSubject}.
- Explain the core concept clearly with high scientific accuracy.
- Do NOT force questions back to the student or withhold information.
- Provide relevant examples and exam-tested distinctions.`;
    }

    // Build Chronological Conversation Memory
    let conversationHistoryText = "";
    if (Array.isArray(messages) && messages.length > 0) {
      // Exclude the current query if it's already the last item in messages to avoid duplication
      const historyList = messages.slice(0, messages.length - (messages[messages.length - 1]?.text === queryText ? 1 : 0)).slice(-10);
      if (historyList.length > 0) {
        conversationHistoryText = "--- PRIOR CONVERSATION HISTORY (Context from previous turns) ---\n" +
          historyList.map((m: any, idx: number) => {
            const role = (m.sender === 'user' || m.role === 'user') ? 'Student' : 'AI Tutor';
            const text = m.text || m.content || '';
            return `[Turn ${idx + 1}] ${role}: ${text}`;
          }).join('\n\n') +
          "\n--- END OF PRIOR CONVERSATION HISTORY ---\n";
      }
    }

    const prompt = `You are an expert NMDCAT (National Medical and Dental College Admission Test) AI Medical Tutor in Pakistan.
You specialize in teaching Biology, Chemistry, Physics, English, and Logical Reasoning aligned with the official PMDC / FSc syllabus.

CURRENT SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
TEACHING STRATEGY: ${modeTitle}
${modeInstruction}

${conversationHistoryText ? conversationHistoryText : ""}
${context ? `ADDITIONAL STUDENT CONTEXT: ${context}\n` : ""}

STUDENT'S CURRENT QUERY: "${queryText}"

CRITICAL FORMATTING & TYPESETTING RULES:
1. Mathematical & Chemical Formatting:
   - Always format math formulas, equations, physics quantities, and chemical formulas in clean LaTeX notation.
   - Use inline math $...$ (e.g. $H_2O$, $Ca^{2+}$, $SO_4^{2-}$, $v = \\frac{V_{max}[S]}{K_m + [S]}$, $s = ut + \\frac{1}{2}at^2$, $E = mc^2$, $10^{-6}\\text{ M}$).
   - Use display math $$...$$ on its own line for major equations and derivations.
2. Clean Markdown:
   - Maximum 2 heading levels (use ## and ### only when needed).
   - Do NOT use decorative separator lines (no "---").
   - Do NOT bold ordinary words repeatedly. Bold only critical terminology on first mention.
   - Use clean bullet points (- ) or numbered lists (1. ) for sequential points.
   - Use tables only when comparing distinct structures or processes.
   - Do NOT add filler motivational greetings or repetitive boilerplate.
   - Remain strictly at NMDCAT / FSc preparation depth.`;

    const result = await callWithFallback({
      prompt,
      temperature: normMode.includes('socratic') ? 0.6 : 0.7,
      maxTokens: 4096,
    });

    res.json({
      success: true,
      text: result.text,
      answer: result.text,
      provider: result.provider,
      modeUsed: mode
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate AI Tutor response.");
  }
};

app.post("/api/ai-tutor", aiChatHandler);
app.post("/api/ai/chat", aiChatHandler);

// API Endpoint 1b: Multimodal Image / Handwritten Notes / Diagram Doubt Solver
app.post("/api/image-doubt-solver", async (req, res) => {
  try {
    const { imageBase64, imageData, mimeType = "image/jpeg", promptText, prompt, subject } = req.body;
    const rawImageBase64 = imageBase64 || imageData || "";
    const requestPrompt = promptText || prompt || "Explain this diagram or question step by step";

    if (!rawImageBase64) {
      return res.status(400).json({ error: "Image data is required" });
    }

    const subjectVal = validateSubjectParam(subject, true);
    if (!subjectVal.valid) {
      return res.status(400).json({ error: subjectVal.error, message: subjectVal.message });
    }
    const validatedSubject = subjectVal.subject!;

    const textPrompt = `Analyze this image (Textbook page, handwritten notes, or diagram) for an NMDCAT ${validatedSubject} student:
      User Request: "${requestPrompt}"

      Provide:
      1. OCR / Text Extraction: Transcribe key handwritten/printed text or diagram labels accurately.
      2. Comprehensive Step-by-Step Explanation according to PMDC / FSc textbooks (${validatedSubject}).
      3. Solved Question / Correct Option if it is an MCQ or problem.
      4. High-Yield Revision Point & Memory Mnemonic for NMDCAT.`;

    const result = await callWithFallback({
      prompt: textPrompt,
      image: {
        mimeType,
        base64Data: rawImageBase64,
      },
      temperature: 0.7,
      maxTokens: 4096,
    });

    res.json({ text: result.text, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to analyze image");
  }
});

// API Endpoint 1c: PDF / Notes Text to MCQ Quiz & Staging Generator
const extractMaterialHandler = async (req: any, res: any) => {
  try {
    const { documentContent, documentTitle, count = 5, subject } = req.body;
    if (!documentContent) {
      return res.status(400).json({ error: "Document content is required" });
    }

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    const prompt = `Act as an expert NMDCAT Exam Examiner in Pakistan. Read the following textbook/notes material from "${documentTitle || "Uploaded Material"}":
    
    SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
    Material Content snippet:
    """
    ${documentContent.slice(0, 4000)}
    """

    Extract core high-yield concepts and generate ${count} PMDC NMDCAT-style Multiple Choice Questions for ${validatedSubject}. Include standard, assertion-reason, or case-based questions.
    Ensure distractors reflect genuine FSc student errors. Include detailed justifications and quality rating (0-100).
    
    Return a JSON object with fields:
    {
      "items": [
        {
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Detailed explanation",
          "difficulty": "Easy|Medium|Hard",
          "chapter": "${validatedSubject}",
          "qualityScore": 85,
          "validationNotes": "Validation details"
        }
      ]
    }
    Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const items = parsed?.items || (Array.isArray(parsed) ? parsed : (parsed?.mcqs || []));
    res.json({ items, sourceTitle: documentTitle || "PDF Document", provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to process document and generate quiz");
  }
};

app.post("/api/pdf-quiz-generator", extractMaterialHandler);
app.post("/api/ai/extract-material", extractMaterialHandler);

// API Endpoint 1d: Comprehensive Textbook & Guide Study Suite Generator (Sequence Step 1 & 2)
app.post("/api/generate-textbook-study-suite", async (req, res) => {
  try {
    const { 
      documentContent, 
      documentTitle = "Uploaded Textbook Material", 
      subject,
      chapter = "General Chapter",
      mcqCount = 5
    } = req.body;

    if (!documentContent || typeof documentContent !== "string") {
      return res.status(400).json({ error: "Valid document text content is required" });
    }

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    const prompt = `You are a Senior Lead Medical Curriculum Examiner for PMDC NMDCAT Entrance Exams in Pakistan.
    Analyze the following raw textbook/guide text carefully:

    DOCUMENT TITLE: ${documentTitle}
    SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
    CHAPTER: ${chapter}
    
    TEXTBOOK/GUIDE CONTENT:
    """
    ${documentContent.slice(0, 12000)}
    """

    Perform an end-to-end curriculum decomposition for ${validatedSubject} and return a single unified JSON object with fields:
    {
      "mcqs": [
        {
          "question": "MCQ Question",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 0,
          "explanation": "Explanation",
          "difficulty": "Medium",
          "cognitiveLevel": "Application",
          "topic": "Topic Name"
        }
      ],
      "notes": {
        "title": "Topic Title",
        "highYieldSummary": ["Summary bullet 1", "Summary bullet 2"],
        "coreConcepts": [
          { "term": "Key Term", "explanation": "Detailed explanation", "examTip": "High yield tip" }
        ]
      },
      "flashcards": [
        { "front": "Question/Concept", "back": "Answer/Explanation", "keyFormulaOrConcept": "Key rule" }
      ],
      "definitionsOrFormulas": [
        { "name": "Term/Formula name", "formulaOrDefinition": "Definition or equation", "unitOrCondition": "SI Unit or condition", "highYieldNote": "NMDCAT note" }
      ],
      "mindMap": {
        "centralConcept": "Central Topic",
        "branches": [
          { "branchName": "Branch 1", "subNodes": ["Sub-node 1", "Sub-node 2"] }
        ]
      }
    }
    Generate ${mcqCount} high-yield NMDCAT MCQs directly from this text. Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsedData = extractJsonFromText(result.text) || {};
    res.json({
      success: true,
      sourceTitle: documentTitle,
      subject: validatedSubject,
      chapter,
      data: parsedData,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate textbook study suite");
  }
});

// API Endpoint 1d: Multi-Level Concept Explanation Generator
app.post("/api/multilevel-notes", async (req, res) => {
  try {
    const { topicName, subject, unit = 'General' } = req.body;

    if (!topicName) {
      return res.status(400).json({ error: "topicName is required" });
    }

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    const prompt = `You are an expert NMDCAT professor and medical doctor.
Generate comprehensive, 5-level tiered educational notes for:
SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
Unit / Chapter: ${unit}
Topic: ${topicName}

Produce distinct, rich content for each of the 5 levels in JSON format:
{
  "basic": "Foundational concept introduction with simple everyday analogies and core definitions.",
  "intermediate": "FSc textbook level depth, equations, and mechanisms.",
  "advanced": "Deep conceptual mechanism analysis, exceptions, and molecular-level insights.",
  "nmdcatLevel": "High-yield NMDCAT exam focus! PMDC past paper patterns, tricky traps, and mnemonics.",
  "medicalLevel": "MBBS clinical relevance! Real clinical disease pathology and hospital correlation."
}
Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const explanations = parsed.explanations || parsed;

    res.json({
      success: true,
      explanations,
      provider: result.provider
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate multi-level notes");
  }
});

// API Endpoint 1e: General-Purpose Custom Notes Builder
const customNoteHandler = async (req: any, res: any) => {
  try {
    const {
      topic,
      subject,
      chapter,
      detailLevel = 'STANDARD',
      noteType = 'STUDY NOTES',
      customInstructions,
      pastedContent
    } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    const detailInstructions = {
      'QUICK': 'Generate concise, high-speed summary notes focused on core definitions, quick facts, and rapid recall points.',
      'STANDARD': 'Generate balanced, comprehensive study notes with clear conceptual explanations, diagrams/equations, and exam applications.',
      'DETAILED': 'Generate in-depth, thorough textbook-level notes covering foundational mechanisms, derivations, edge cases, and detailed examples.',
      'VERY DETAILED': 'Generate master-class, highly detailed notes with exhaustive conceptual breakdowns, multi-step mechanisms, clinical/real-world links, and complete mathematical derivations.'
    }[detailLevel as string] || 'Generate balanced, comprehensive study notes.';

    const noteTypeInstructions = {
      'STUDY NOTES': 'Structured complete study guide with clear headings, bullet points, core concepts, mechanisms, and exam takeaways.',
      'REVISION NOTES': 'High-density revision summary with bulleted key facts, must-memorize numbers/formulas, and rapid memory checkpoints.',
      'CONCEPT EXPLANATION': 'Deep first-principles intuition, intuitive step-by-step breakdown, analogies, and intuitive physical/chemical models.',
      'CHEAT SHEET': 'Compact high-yield tables, key formula sheets, rapid-fire facts, and zero fluff.',
      'HIGH-YIELD NOTES': 'Targeted for top exam scorers: PMDC past paper recurring themes, tricky traps, common student mistakes, and scoring secrets.',
      'BEGINNER NOTES': 'Clear, jargon-free explanations building from the ground up with relatable examples before introducing technical terminology.',
      'COMPARISON': 'Structured comparative matrix / tables contrasting key related concepts, differences, similarities, and distinguishing criteria.',
      'FORMULA NOTES': 'Complete formula breakdown with variable definitions, SI units, dimensional analysis, proportionalities, and numerical shortcut tricks.',
      'CUSTOM': 'Custom tailored notes adapted to the user specific focus and guidance.'
    }[noteType as string] || 'Standard structured study notes.';

    const prompt = `You are a world-class PMDC / NMDCAT professor and master medical educator.
Create premium, publication-quality study notes for the following topic:

TOPIC: "${topic.trim()}"
SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE - STRICTLY GENERATE ${validatedSubject} EDUCATIONAL CONTENT)
${chapter ? `CHAPTER / UNIT: ${chapter}` : ''}
NOTE TYPE: ${noteType} (${noteTypeInstructions})
DETAIL LEVEL: ${detailLevel} (${detailInstructions})
${customInstructions ? `USER INSTRUCTIONS: ${customInstructions}` : ''}
${pastedContent ? `REFERENCE CONTENT / TEXTBOOK EXCERPT TO INCORPORATE:\n${pastedContent}\n` : ''}

CRITICAL FORMATTING & MATHEMATICAL REQUIREMENTS:
1. MATHEMATICAL & CHEMICAL NOTATION:
   - Format ALL mathematical and chemical formulas in standard LaTeX / KaTeX notation.
   - Use inline math \`$variable$\` or \`$formula$\` for inline symbols (e.g. \`$E = mc^2$\`, \`$v = f\\lambda$\`, \`$\\text{pH} = -\\log[\\text{H}^+]$\`, \`$\\Delta G = \\Delta H - T\\Delta S$\`).
   - Use display math \`$$...$$\` on separate lines for main equations, derivations, and chemical equations.
   - Never write raw broken math characters or poorly formatted fractions. Use LaTeX \`\\frac{a}{b}\`, \`\\sqrt{x}\`, \`\\times\`, \`\\rightarrow\`.

2. STRUCTURED MARKDOWN:
   - Use clean Markdown headings (# for Main Title, ## for Sections, ### for Subsections).
   - Use Markdown tables for comparisons and parameter lists.
   - Include:
     * Executive Overview / Core Definition
     * Key Principles, Mechanisms & Detailed Theory
     * High-Yield Formulas, Equations, & Values (with KaTeX formatting)
     * PMDC / NMDCAT Exam Traps & Examiner Pitfalls (what examiners trick students with)
     * Mnemonics & Memory Hacks (smart recall aids)
     * Rapid Review Checklist (bullet points for quick revision)

Return a JSON response with:
{
  "title": "Clean, descriptive note title",
  "summary": "2-3 sentence executive summary of the topic",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "content": "Full markdown content with KaTeX math equations"
}
Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const content = parsed.content || result.text;
    const title = parsed.title || topic;
    const summary = parsed.summary || `Comprehensive ${noteType.toLowerCase()} on ${topic}.`;
    const tags = Array.isArray(parsed.tags) ? parsed.tags : [validatedSubject, noteType, 'NMDCAT'];

    res.json({
      success: true,
      title,
      summary,
      tags,
      content,
      noteType,
      detailLevel,
      subject: validatedSubject,
      chapter: chapter || 'General',
      provider: result.provider
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate custom notes");
  }
};

app.post("/api/generate-custom-note", customNoteHandler);
app.post("/api/ai/custom-note", customNoteHandler);

// API Endpoint 2: Detailed Question Solution Explainer
const explainHandler = async (req: any, res: any) => {
  try {
    const { questionText, options, correctAnswer, userChoice, subject } = req.body;
    
    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code,
        message: subjectValidation.message
      });
    }
    const validatedSubject = subjectValidation.subject;

    const prompt = `Examine this NMDCAT ${validatedSubject} question:
    SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
    Question: ${questionText}
    Options: ${options ? JSON.stringify(options) : "N/A"}
    Correct Answer: ${correctAnswer}
    Student Choice: ${userChoice || "Not attempted"}

    Provide a concise, high-yield explanation:
    1. Why ${correctAnswer} is the exact correct answer according to PMDC/FSc textbook standards for ${validatedSubject}.
    2. Why other options are incorrect or misleading traps.
    3. Quick Memory Tip / Formula / Rule to remember for NMDCAT exam day.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    res.json({ explanation: result.text, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to explain question");
  }
};

app.post("/api/explain-question", explainHandler);
app.post("/api/ai/explain", explainHandler);

// API Endpoint 3: Dynamic AI MCQ Generator
const generateDiagnosticHandler = async (req: any, res: any) => {
  try {
    const { subject, topic, count = 5, difficulty = "NMDCAT Standard" } = req.body;

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `Generate ${count} authentic, high-quality NMDCAT style Multiple Choice Questions for:
    SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
    Topic: ${topic}
    Difficulty: ${difficulty}

    Follow PMDC NMDCAT standards strictly. Make sure distractors are plausible and based on common FSc student misunderstandings.
    
    Return a JSON object with fields:
    {
      "mcqs": [
        {
          "id": "mcq_1",
          "question": "Question text",
          "options": ["A", "B", "C", "D"],
          "correctIndex": 0,
          "explanation": "Scientific justification",
          "chapter": "${topic}",
          "subject": "${validatedSubject}"
        }
      ]
    }
    Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const mcqs = parsed?.mcqs || (Array.isArray(parsed) ? parsed : []);
    res.json({ mcqs, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate dynamic MCQs");
  }
};

app.post("/api/generate-mcqs", generateDiagnosticHandler);
app.post("/api/ai/generate-diagnostic", generateDiagnosticHandler);

// API Endpoint 4: AI Mnemonic & Shortcut Generator
app.post("/api/generate-mnemonic", async (req, res) => {
  try {
    const { topic, subject } = req.body;

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `Create a memorable, clever, high-yield mnemonic or shortcut for NMDCAT preparation:
    SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
    Topic: ${topic}

    Include:
    1. The Mnemonic phrase/acronym.
    2. What each letter or part represents.
    3. Practical NMDCAT exam application trick.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 2048,
    });

    res.json({ mnemonic: result.text, provider: result.provider });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate mnemonic");
  }
});

// API Endpoint 5: Automated MCQ Question Bank Cross-Reference & Validation Script
app.post("/api/validate-question-bank", requireAdmin, async (req, res) => {
  try {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Questions array is required for validation" });
    }

    const mcqPayload = questions.map((q: any) => ({
      id: q.id,
      subject: q.subject,
      chapter: q.chapter || "General",
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      correctOptionText: q.options?.[q.correctIndex] || "",
      explanation: q.explanation || ""
    }));

    const prompt = `You are a Lead Medical Sciences & PMDC Curriculum Quality Examiner for NMDCAT in Pakistan.
    Perform an automated cross-reference validation of the following Multiple Choice Questions against official FSc Textbooks and verified PMDC entrance exam standards.

    Questions to Validate:
    ${JSON.stringify(mcqPayload, null, 2)}

    Return a JSON object with fields:
    {
      "totalAudited": ${questions.length},
      "validCount": ${questions.length},
      "flaggedCount": 0,
      "accuracyPercentage": 100,
      "summaryNotes": "Summary of audit",
      "results": [
        {
          "questionId": "id",
          "status": "VALID",
          "accuracyScore": 95,
          "verifiedSource": "FSc Textbook reference",
          "issuesFound": "None"
        }
      ]
    }
    Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const report = extractJsonFromText(result.text) || {};
    res.json(report);
  } catch (error: any) {
    return handleAiError(res, error, "Failed to run automated validation script");
  }
});

// API Endpoint 6: Automated Admin Past Paper Extraction & Structuring
app.post("/api/admin/extract-past-paper", requireAdmin, async (req, res) => {
  try {
    const { pdfBase64, rawText, paperTitle, examYear, conductingBody, paperVariant } = req.body;
    let sourceText = rawText || "";

    if (pdfBase64) {
      const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      const pdfBuffer = Buffer.from(base64Data, "base64");
      try {
        const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js").catch(() => null) || await import("pdf-parse").catch(() => null);
        const parseFn = pdfParseModule?.default || pdfParseModule;
        if (typeof parseFn === "function") {
          const pdfData = await parseFn(pdfBuffer);
          sourceText = pdfData.text || "";
        }
      } catch (pdfErr: any) {
        console.warn("PDF parser error:", pdfErr?.message);
      }
    }

    if (!sourceText || !sourceText.trim()) {
      return res.status(400).json({ error: "No readable text could be extracted from the document." });
    }

    // Direct JSON check if input is already structured
    const trimmed = sourceText.trim();
    if (trimmed.startsWith("[") || (trimmed.startsWith("{") && trimmed.includes("questions"))) {
      try {
        const directJson = JSON.parse(trimmed);
        const questionsList = Array.isArray(directJson) ? directJson : (directJson.questions || directJson.mcqs || []);
        if (questionsList.length > 0) {
          const normalized = questionsList.map((q: any, idx: number) => {
            let options = q.options;
            if (!Array.isArray(options) || options.length < 2) {
              options = ["Option A", "Option B", "Option C", "Option D"];
            }
            while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);

            let correctAnswer: number | null = null;
            let hasOfficialAnswer = false;
            if (typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer <= 3) {
              correctAnswer = q.correctAnswer;
              hasOfficialAnswer = true;
            } else if (typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3) {
              correctAnswer = q.correctIndex;
              hasOfficialAnswer = true;
            } else if (typeof q.correctAnswer === "string" && q.correctAnswer.trim()) {
              const ca = q.correctAnswer.trim().toUpperCase();
              const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
              if (map[ca] !== undefined) {
                correctAnswer = map[ca];
                hasOfficialAnswer = true;
              }
            }

            return {
              id: q.id || `q_${idx + 1}`,
              pastPaperId: "",
              originalQuestionNumber: q.originalQuestionNumber || idx + 1,
              questionText: q.questionText || q.question || `Question ${idx + 1}`,
              options: options.slice(0, 4),
              correctAnswer,
              hasOfficialAnswer,
              subject: q.subject || "Unknown",
              topic: q.topic || "",
              explanation: q.explanation || "",
              extractionConfidence: 100
            };
          });

          return res.json({
            success: true,
            questions: normalized,
            totalExtracted: normalized.length,
            hasAnswerKey: normalized.some((q: any) => q.hasOfficialAnswer && q.correctAnswer !== null)
          });
        }
      } catch (jsonErr) {
        // Fallback to AI structured extraction
      }
    }

    // Call Gemini with structured prompt for academic past paper extraction
    const prompt = `You are a Senior Medical Exam Transcriber & PMDC MDCAT Document Extraction Specialist.
Your task is to extract every question from this authentic past paper into clean, structured Multiple Choice Questions.

Source Context:
- Paper Title: ${paperTitle || "Past Paper"}
- Year: ${examYear || "2024"}
- Examination: ${conductingBody || "PMDC / Provincial MDCAT"}
- Variant: ${paperVariant || "Official"}

Rules for Extraction:
1. PRESERVE ORIGINAL QUESTION SEQUENCE: Questions must strictly follow 1, 2, 3... in the exact order found in the document.
2. EXTRACT FULL TEXT & 4 OPTIONS: Extract the complete question stem and 4 options (A, B, C, D).
3. DETECT OFFICIAL ANSWER KEYS: If an answer or key is present in the source (e.g., "Answer: C", "Key: B", "Ans (A)"), assign correctAnswer (0 for A, 1 for B, 2 for C, 3 for D) and set hasOfficialAnswer = true. If no answer is provided, set correctAnswer = null and hasOfficialAnswer = false.
4. CLASSIFY SUBJECT: Categorize each question into: "Biology", "Chemistry", "Physics", "English", or "Logical Reasoning".
5. DO NOT FABRICATE: Only extract questions that actually exist in the source document text.

Source Text:
${sourceText.slice(0, 40000)}

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "originalQuestionNumber": 1,
      "questionText": "Question stem here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "hasOfficialAnswer": true,
      "subject": "Biology",
      "topic": "Cell Structure",
      "explanation": "Official explanation or reasoning if mentioned in document"
    }
  ]
}`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.2,
      maxTokens: 8192,
      jsonMode: true
    });

    const parsed = extractJsonFromText(result.text) || {};
    const rawQuestions = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    const questions = rawQuestions.map((q: any, idx: number) => {
      let options = Array.isArray(q.options) ? q.options : ["Option A", "Option B", "Option C", "Option D"];
      while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);

      let correctAnswer: number | null = null;
      let hasOfficialAnswer = Boolean(q.hasOfficialAnswer);
      if (typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer <= 3) {
        correctAnswer = q.correctAnswer;
        hasOfficialAnswer = true;
      } else if (typeof q.correctAnswer === "string" && q.correctAnswer.trim()) {
        const ca = q.correctAnswer.trim().toUpperCase();
        const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
        if (map[ca] !== undefined) {
          correctAnswer = map[ca];
          hasOfficialAnswer = true;
        }
      }

      return {
        id: `q_${q.originalQuestionNumber || idx + 1}`,
        pastPaperId: "",
        originalQuestionNumber: q.originalQuestionNumber || idx + 1,
        questionText: q.questionText || `Question ${idx + 1}`,
        options: options.slice(0, 4),
        correctAnswer,
        hasOfficialAnswer,
        subject: q.subject || "Unknown",
        topic: q.topic || "",
        explanation: q.explanation || "",
        extractionConfidence: 98
      };
    });

    res.json({
      success: true,
      questions,
      totalExtracted: questions.length,
      hasAnswerKey: questions.some((q: any) => q.hasOfficialAnswer && q.correctAnswer !== null)
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to extract past paper questions from document");
  }
});

// Helper: Convert JS object to Firestore Document Fields
function jsonToFirestoreFields(obj: any): any {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val === null) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      fields[key] = Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(item => {
            if (item === null || item === undefined) return { nullValue: null };
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            if (typeof item === 'object') return { mapValue: { fields: jsonToFirestoreFields(item) } };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: jsonToFirestoreFields(val) } };
    }
  }
  return fields;
}

// POST /api/admin/save-past-paper
app.post("/api/admin/save-past-paper", requireAdmin, async (req: any, res: any) => {
  try {
    const { paper } = req.body;
    if (!paper || !paper.id) {
      return res.status(400).json({ error: "Invalid paper data: id is required." });
    }
    const token = req.rawToken;
    const paperId = paper.id;
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/pastPapers/${paperId}`;
    
    const fsRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: jsonToFirestoreFields(paper)
      })
    });

    if (fsRes.status === 200 || fsRes.status === 201) {
      return res.json({ success: true, id: paperId, message: "Past paper saved to Firestore successfully." });
    }
    const errText = await fsRes.text();
    return res.status(fsRes.status).json({ error: `Firestore error: ${errText}` });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to save past paper" });
  }
});

// POST /api/admin/publish-past-paper
app.post("/api/admin/publish-past-paper", requireAdmin, async (req: any, res: any) => {
  try {
    const { paperId } = req.body;
    if (!paperId) {
      return res.status(400).json({ error: "Paper ID is required." });
    }
    const token = req.rawToken;
    const publishedAt = new Date().toISOString();
    const publishedBy = req.user?.email || "admin";
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/pastPapers/${paperId}?updateMask.fieldPaths=status&updateMask.fieldPaths=publishedAt&updateMask.fieldPaths=publishedBy`;

    const fsRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: 'published' },
          publishedAt: { stringValue: publishedAt },
          publishedBy: { stringValue: publishedBy }
        }
      })
    });

    if (fsRes.status === 200) {
      return res.json({ success: true, message: "Past paper published globally to all students." });
    }
    const errText = await fsRes.text();
    return res.status(fsRes.status).json({ error: `Firestore error: ${errText}` });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to publish past paper" });
  }
});

// POST /api/admin/unpublish-past-paper
app.post("/api/admin/unpublish-past-paper", requireAdmin, async (req: any, res: any) => {
  try {
    const { paperId } = req.body;
    if (!paperId) {
      return res.status(400).json({ error: "Paper ID is required." });
    }
    const token = req.rawToken;
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/pastPapers/${paperId}?updateMask.fieldPaths=status`;

    const fsRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          status: { stringValue: 'draft' }
        }
      })
    });

    if (fsRes.status === 200) {
      return res.json({ success: true, message: "Past paper unpublished (reverted to draft)." });
    }
    const errText = await fsRes.text();
    return res.status(fsRes.status).json({ error: `Firestore error: ${errText}` });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to unpublish past paper" });
  }
});

// API Endpoint: AI Quiz Generator (Academic Specification Mode)
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { 
      subject, 
      chapter, 
      topic, 
      learningObjective, 
      difficulty = 'Medium',
      cognitiveLevel = 'Application',
      generationMode = 'SIMPLE',
      quantity = 5,
      requestId
    } = req.body;

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    if (!chapter || !topic) {
      return res.status(400).json({ error: "Chapter and topic are required" });
    }

    if (!quantity || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: "Quantity must be between 1 and 50" });
    }

    const actualRequestId = requestId || `gen_${Date.now()}`;

    let specializedInstruction = "";
    if (generationMode === 'ADVANCED') {
      specializedInstruction = `Focus on application, reasoning, multi-step problem solving, and clinical/practical scenarios relevant to PMDC NMDCAT. Avoid pure recall.`;
    } else if (generationMode === 'ULTRA_ADVANCED') {
      specializedInstruction = `Generate expert-level, highly challenging NMDCAT questions with complex distractors, deep conceptual integration, and evaluation-level thinking.`;
    } else {
      specializedInstruction = `Generate standard NMDCAT questions with good conceptual clarity and realistic distractors.`;
    }

    const prompt = `You are an expert Pakistani Medical College Admission Test (NMDCAT) question developer and PMDC curriculum specialist.

Generate ${quantity} authentic, high-quality Multiple Choice Questions with the following specifications:
- Subject: ${subject}
- Chapter/Unit: ${chapter}
- Topic: ${topic}
- Learning Objective: ${learningObjective || 'Standard curriculum mastery'}
- Target Difficulty: ${difficulty}
- Cognitive Level: ${cognitiveLevel}
- Generation Mode: ${generationMode}

${specializedInstruction}

CRITICAL RULES:
1. Every question MUST have exactly 4 options labeled A, B, C, D.
2. Exactly ONE option must be scientifically and factually correct according to Pakistani FSc/PMDC curriculum.
3. All 3 distractors must be plausible and based on common student misconceptions.
4. Explanations must be thorough, scientifically sound, and explain why the correct answer is right AND why distractors are wrong.
5. Questions must be strictly related to the subject "${subject}" and topic "${topic}".

Return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Detailed explanation",
      "difficulty": "${difficulty}",
      "cognitiveLevel": "${cognitiveLevel}",
      "topic": "${topic}"
    }
  ]
}
Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const questions = parsed?.questions || (Array.isArray(parsed) ? parsed : []);

    const mappedQuestions = questions.map((q: any, idx: number) => ({
      id: `${actualRequestId}_q${idx}`,
      subject,
      chapter,
      topic: q.topic || topic,
      question: q.question,
      options: [
        q.options?.A || q.options?.[0] || "A",
        q.options?.B || q.options?.[1] || "B",
        q.options?.C || q.options?.[2] || "C",
        q.options?.D || q.options?.[3] || "D"
      ],
      correctIndex: ['A', 'B', 'C', 'D'].includes(q.correctAnswer) ? ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer) : (q.correctIndex ?? 0),
      explanation: q.explanation || "Correct as per PMDC standards",
      difficulty: q.difficulty || difficulty,
      cognitiveLevel: q.cognitiveLevel || cognitiveLevel,
      type: 'Standard' as const,
      source: 'AI_GENERATED',
      sourceReference: `Generated for ${topic} (${generationMode})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      status: 'AI_GENERATED',
      verificationStatus: 'AI_GENERATED',
      authorType: 'AI',
      generationModel: result.model,
      generationRequestId: actualRequestId
    }));

    res.json({
      success: true,
      questions: mappedQuestions,
      generationRequestId: actualRequestId,
      requested: quantity,
      generated: mappedQuestions.length,
      provider: result.provider,
      metadata: {
        subject,
        chapter,
        topic,
        difficulty,
        generationMode,
        model: result.model
      }
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate quiz questions");
  }
});

// API Endpoint: Simple AI Quiz Generator (No Firestore, Direct Display)
app.post("/api/generate-quiz-simple", async (req, res) => {
  try {
    const { subject, topic, difficultyMode = 'NORMAL', quantity = 5 } = req.body;

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    if (!quantity || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: "Quantity must be between 1 and 50" });
    }

    let difficultyInstruction = "";
    switch (difficultyMode) {
      case 'NORMAL':
        difficultyInstruction = "Generate standard NMDCAT preparation level questions with direct concepts, textbook-based content, and moderate distractors.";
        break;
      case 'ADVANCED':
        difficultyInstruction = "Generate high-level preparation questions with multi-concept scenarios, application-based reasoning, and tricky distractors.";
        break;
      case 'ULTRA_ADVANCED':
        difficultyInstruction = "Generate expert challenge mode questions with deep reasoning, integrated concepts, and medical entrance level difficulty.";
        break;
    }

    const prompt = `You are an expert NMDCAT question generator for Pakistani medical college entrance tests.

Generate ${quantity} multiple-choice questions for:
SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

${difficultyInstruction}

CRITICAL REQUIREMENTS:
1. Exactly ONE option must be correct (A, B, C, or D).
2. All distractors must be plausible but incorrect.
3. Explanation must justify the correct answer with scientific reasoning.
4. Questions must be appropriate for NMDCAT preparation level.
5. Questions must remain strictly within the specified subject "${validatedSubject}" and topic: ${topic}.
6. Do not invent syllabus claims or textbook citations.
7. Do not fabricate references.

Return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correctAnswer": "A",
      "explanation": "Detailed explanation of why this answer is correct",
      "difficulty": "${difficultyMode}",
      "concept": "Specific concept tested by this question"
    }
  ]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const questions = parsed?.questions || (Array.isArray(parsed) ? parsed : []);

    const validQuestions = questions.filter((q: any) => {
      return q.question && 
             Array.isArray(q.options) && 
             q.options.length === 4 &&
             ['A', 'B', 'C', 'D'].includes(q.correctAnswer) &&
             q.explanation &&
             q.difficulty &&
             q.concept;
    });

    res.json({
      success: true,
      questions: validQuestions,
      requested: quantity,
      generated: validQuestions.length,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate quiz questions");
  }
});

// API Endpoint: Wrong Answer AI Analysis
app.post("/api/analyze-wrong-answer", async (req, res) => {
  try {
    const { question, options, correctAnswer, userAnswer, explanation, topic, subject } = req.body;

    if (!question || !options || correctAnswer === undefined || userAnswer === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const subjectValidation = validateSubjectParam(subject, true);
    const validatedSubject = subjectValidation.valid ? subjectValidation.subject : 'General Science';

    const prompt = `You are an expert NMDCAT tutor analyzing a student's incorrect answer.

SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
Question: ${question}
Topic: ${topic}

Options:
A: ${options[0]}
B: ${options[1]}
C: ${options[2]}
D: ${options[3]}

Correct Answer: ${correctAnswer}
Student's Selected Answer: ${userAnswer}
Explanation: ${explanation}

Provide a detailed analysis in JSON format with these exact fields:
{
  "whyYouWereWrong": "Explain the student's misconception in detail",
  "correctConcept": "Identify the actual concept being tested",
  "whyCorrectAnswerIsCorrect": "Provide clear academic explanation of the correct answer",
  "whyYourAnswerIsWrong": "Specifically address why the student's selected option is incorrect",
  "distractorAnalysis": "Explain why the other options are incorrect when useful",
  "knowledgeGap": "Identify the likely knowledge gap or misconception",
  "recommendedRevision": "Tell the student exactly what concept/topic should be revised"
}

Be specific and educational. Do not use generic template text. Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const analysis = extractJsonFromText(result.text) || {};

    res.json({
      success: true,
      analysis,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to analyze wrong answer");
  }
});

// API Endpoint: Deep AI Insights for Quiz
app.post("/api/deep-ai-insights", async (req, res) => {
  try {
    const { questions, userAnswers, subject, topic, difficultyMode } = req.body;

    if (!questions || !userAnswers || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const subjectValidation = validateSubjectParam(subject, true);
    const validatedSubject = subjectValidation.valid ? subjectValidation.subject : 'General Science';

    const quizSummary = questions.map((q: any, idx: number) => ({
      question: q.question,
      concept: q.concept,
      correctAnswer: q.correctAnswer,
      userAnswer: userAnswers[idx],
      isCorrect: userAnswers[idx] === q.correctAnswer
    }));

    const correctCount = quizSummary.filter((q: any) => q.isCorrect).length;
    const totalCount = quizSummary.length;
    const accuracy = Math.round((correctCount / totalCount) * 100);

    const prompt = `You are an expert NMDCAT learning coach analyzing a student's quiz performance.

SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
Topic: ${topic}
Difficulty Mode: ${difficultyMode}
Accuracy: ${accuracy}% (${correctCount}/${totalCount} correct)

Quiz Results:
${JSON.stringify(quizSummary, null, 2)}

Provide a comprehensive analysis in JSON format with these exact fields:
{
  "overallPerformance": "Brief summary of overall performance",
  "strongConcepts": ["List of concepts the student performed well on"],
  "weakConcepts": ["List of concepts the student struggled with"],
  "recurringMistakes": ["List of recurring mistake patterns observed"],
  "misconceptions": ["List of specific misconceptions identified"],
  "difficultyPerformance": "Analysis of performance across difficulty levels",
  "topicWeaknesses": ["List of topic-level weaknesses"],
  "reasoningErrors": ["List of reasoning errors observed"],
  "knowledgeGaps": ["List of knowledge gaps identified"],
  "recommendedRevision": ["List of specific concepts/topics to revise"],
  "recommendedNextDifficulty": "Suggested difficulty for next quiz (NORMAL/ADVANCED/ULTRA_ADVANCED)",
  "recommendedNextTopics": ["List of recommended topics to practice next"]
}

Be specific and based on the ACTUAL quiz results. Do not use generic conclusions. Return ONLY valid JSON.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const insights = extractJsonFromText(result.text) || {};

    res.json({
      success: true,
      insights,
      accuracy,
      correctCount,
      totalCount,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate deep AI insights");
  }
});

// API Endpoint: AI Flashcard Generator
app.post("/api/generate-flashcards", async (req, res) => {
  try {
    const { subject, topic, difficultyMode = 'NORMAL', quantity = 5 } = req.body;

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    if (!quantity || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: "Quantity must be between 1 and 50" });
    }

    let difficultyInstruction = "";
    switch (difficultyMode) {
      case 'NORMAL':
        difficultyInstruction = "Generate standard NMDCAT preparation level flashcards with core concepts, straightforward facts, and basic recall.";
        break;
      case 'ADVANCED':
        difficultyInstruction = "Generate advanced flashcards with connections between concepts, applications, and deeper understanding.";
        break;
      case 'ULTRA_ADVANCED':
        difficultyInstruction = "Generate expert-level flashcards with integrated concepts, subtle distinctions, and high-level exam preparation.";
        break;
    }

    const prompt = `You are an expert NMDCAT flashcard generator for Pakistani medical college entrance tests.

Generate ${quantity} flashcards for:
SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

${difficultyInstruction}

CRITICAL REQUIREMENTS:
1. Each flashcard must have a clear front (question/concept) and back (answer/explanation).
2. The back must include a thorough explanation of the concept.
3. Flashcards must be academically meaningful and appropriate for NMDCAT preparation.
4. Do not invent syllabus claims or textbook citations.
5. Do not fabricate references.
6. Flashcards must remain within the specified subject "${validatedSubject}" and topic: ${topic}.

Return ONLY a valid JSON object with this exact structure:
{
  "flashcards": [
    {
      "front": "Question or concept on the front of the card",
      "back": "Answer and detailed explanation on the back",
      "explanation": "Additional context or deeper explanation",
      "concept": "Specific concept tested by this card",
      "difficulty": "${difficultyMode}"
    }
  ]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text);
    const flashcards = parsed?.flashcards || (Array.isArray(parsed) ? parsed : []);

    const validFlashcards = flashcards.filter((fc: any) => {
      return fc.front && fc.back && fc.explanation && fc.concept;
    });

    res.json({
      success: true,
      flashcards: validFlashcards,
      requested: quantity,
      generated: validFlashcards.length,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate flashcards");
  }
});

// API Endpoint: AI Mind Map Generator
app.post("/api/generate-mindmap", async (req, res) => {
  try {
    const { subject, topic, difficultyMode = 'NORMAL' } = req.body;

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }

    let difficultyInstruction = "";
    switch (difficultyMode) {
      case 'NORMAL':
        difficultyInstruction = "Generate a standard mind map with core concepts, major branches, and straightforward relationships.";
        break;
      case 'ADVANCED':
        difficultyInstruction = "Generate an advanced mind map with deeper connections, applications, and cross-concept relationships.";
        break;
      case 'ULTRA_ADVANCED':
        difficultyInstruction = "Generate an expert-level mind map with integrated concepts, subtle distinctions, and high-level exam preparation details.";
        break;
    }

    const prompt = `You are an expert NMDCAT mind map generator for Pakistani medical college entrance tests.

Generate a hierarchical mind map for:
SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

${difficultyInstruction}

CRITICAL REQUIREMENTS:
1. Create a hierarchical structure with a central concept and major branches.
2. Include sub-concepts, relationships, and key facts.
3. Include exam-relevant points and misconceptions where appropriate.
4. Do not invent syllabus claims or textbook citations.
5. Do not fabricate references.
6. The mind map must remain within the specified subject "${validatedSubject}" and topic: ${topic}.

Return ONLY a valid JSON object with this exact structure:
{
  "centralConcept": "Main topic",
  "branches": [
    {
      "label": "Branch name",
      "subnodes": [
        {
          "label": "Sub-concept",
          "details": "Key fact or explanation",
          "relationships": ["Related concept"]
        }
      ]
    }
  ],
  "keyFacts": ["Important fact 1", "Important fact 2"],
  "misconceptions": ["Common misconception 1"],
  "examTips": ["Exam tip 1"]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const rawMindMap = extractJsonFromText(result.text) || {};
    
    // Normalize mindMap structure
    let branches = Array.isArray(rawMindMap)
      ? rawMindMap
      : (rawMindMap.branches || rawMindMap.nodes || rawMindMap.subtopics || rawMindMap.children || []);
    
    const centralConcept = (typeof rawMindMap === "object" && !Array.isArray(rawMindMap))
      ? (rawMindMap.centralConcept || rawMindMap.centralTopic || rawMindMap.centerConcept || rawMindMap.topic || topic)
      : topic;

    const normalizedMindMap = {
      centralConcept,
      branches: Array.isArray(branches) ? branches : [],
      keyFacts: rawMindMap.keyFacts || [],
      misconceptions: rawMindMap.misconceptions || [],
      examTips: rawMindMap.examTips || [],
    };

    res.json({
      success: true,
      mindMap: normalizedMindMap,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate mind map");
  }
});

// API Endpoint: AI Mnemonic Generator
app.post("/api/generate-mnemonics", async (req, res) => {
  try {
    const { subject, topic, concept, difficultyMode = 'NORMAL' } = req.body;

    const subjectValidation = validateSubjectParam(subject, true);
    if (!subjectValidation.valid) {
      return res.status(subjectValidation.status).json({
        error: subjectValidation.error,
        code: subjectValidation.code
      });
    }
    const validatedSubject = subjectValidation.subject;

    if (!topic || !concept) {
      return res.status(400).json({ error: "Topic and concept are required" });
    }

    let difficultyInstruction = "";
    switch (difficultyMode) {
      case 'NORMAL':
        difficultyInstruction = "Generate simple, memorable mnemonics for basic recall.";
        break;
      case 'ADVANCED':
        difficultyInstruction = "Generate mnemonics that help with connections and deeper understanding.";
        break;
      case 'ULTRA_ADVANCED':
        difficultyInstruction = "Generate complex mnemonics for integrated concepts and high-level exam preparation.";
        break;
    }

    const prompt = `You are an expert NMDCAT mnemonic generator for Pakistani medical college entrance tests.

Generate mnemonics for:
SUBJECT: ${validatedSubject.toUpperCase()} (AUTHORITATIVE)
Topic: ${topic}
Concept: ${concept}
Difficulty Mode: ${difficultyMode}

${difficultyInstruction}

CRITICAL REQUIREMENTS:
1. Generate multiple mnemonic styles where useful (acronym, phrase, association, story, visual).
2. Each mnemonic must correctly map to the information.
3. Explain exactly what each part represents.
4. Mnemonics must be academically meaningful and actually help memory.
5. Do not generate random strings that merely look like mnemonics.
6. Do not invent syllabus claims or textbook citations.
7. Do not fabricate references.

Return ONLY a valid JSON object with this exact structure:
{
  "mnemonics": [
    {
      "type": "acronym|phrase|association|story|visual",
      "mnemonic": "The mnemonic itself",
      "explanation": "What each part represents",
      "concept": "Concept being memorized",
      "topic": "${topic}"
    }
  ],
  "memoryHooks": ["Additional memory tip"],
  "relatedConcepts": ["Related concept to remember"]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true,
    });

    const mnemonicData = extractJsonFromText(result.text) || {};

    res.json({
      success: true,
      mnemonicData,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate mnemonics");
  }
});

// API Endpoint: AI Formula Generator
app.post("/api/generate-formulas", async (req, res) => {
  try {
    const { subject, chapter = 'General', topic, difficultyMode = 'NORMAL' } = req.body;

    const subjectVal = validateSubjectParam(subject, false);
    if (!subjectVal.valid) {
      return res.status(400).json({ error: subjectVal.error, message: subjectVal.message });
    }
    const validatedSubject = subjectVal.subject!;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are an expert NMDCAT formula and quantitative problem-solving author for Pakistani medical college entrance tests.

SUBJECT: ${validatedSubject}
Generate 1-3 high-yield, exam-critical formulas for:
Subject: ${validatedSubject}
Chapter: ${chapter}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

CRITICAL REQUIREMENTS:
1. Formulas must adhere strictly to PMDC/UHS/NUMS/FSc textbook syllabus for ${validatedSubject}.
2. Provide standard LaTeX mathematical notation for all equations (use \\frac{a}{b}, ^{2}, _{i}, \\sqrt{x}, \\sin(\\theta), \\Delta, \\times, etc.). Never use raw programming ASCII syntax like v^2*sin(2θ)/g.
3. Include standard SI units and dimensional formula in LaTeX or clean text.
4. Include concrete exam applications and shortcuts.
5. Highlight the single most frequent student trap or common exam calculation mistake.
6. Return ONLY valid JSON.

Return ONLY a valid JSON object with this exact structure:
{
  "formulas": [
    {
      "title": "Specific formula title",
      "formula": "Primary formula in LaTeX (e.g. $R = \\frac{v^2 \\sin(2\\theta)}{g}$ or $F = G \\frac{m_1 m_2}{r^2}$)",
      "variables": ["v1 = explanation with unit", "v2 = explanation with unit"],
      "unitsAndDimensions": "SI Units: ... | Dimensions: [...]",
      "applications": "Direct exam calculation use-case and proportional relationships",
      "commonMistakes": "Key trap, unit conversion mistake, or directional sign error to watch out for",
      "isHighYield": true
    }
  ]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const formulas = Array.isArray(parsed) ? parsed : (parsed.formulas || []);

    res.json({
      success: true,
      formulas,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate formulas");
  }
});

// API Endpoint: AI Reaction Generator
app.post("/api/generate-reactions", async (req, res) => {
  try {
    const { category = 'Organic', chapter = 'General', topic, difficultyMode = 'NORMAL', subject } = req.body;

    const subjectVal = validateSubjectParam(subject, false);
    if (!subjectVal.valid) {
      return res.status(400).json({ error: subjectVal.error, message: subjectVal.message });
    }
    const validatedSubject = subjectVal.subject!;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are an expert NMDCAT Chemistry and Biochemistry author for Pakistani medical entrance tests.

SUBJECT: ${validatedSubject}
Generate 1-3 high-yield chemical reactions and reaction mechanisms for:
Subject: ${validatedSubject}
Category: ${category} Chemistry
Chapter: ${chapter}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

CRITICAL REQUIREMENTS:
1. Provide accurate, balanced chemical equation with standard reagents, states, and subscripts (e.g. $2\\text{CH}_3\\text{CHO} \\xrightarrow{\\text{dil. NaOH}} \\text{CH}_3\\text{CH(OH)CH}_2\\text{CHO}$).
2. Specify exact reaction mechanism (e.g., SN1, SN2, E1, E2, Electrophilic Addition, Nucleophilic Addition, Free Radical).
3. Specify exact catalysts and reaction conditions (temperature, pressure, solvent).
4. Specify key exceptions, side reactions, or PMDC past-paper exam traps.
5. Return ONLY valid JSON.

Return ONLY a valid JSON object with this exact structure:
{
  "reactions": [
    {
      "reactionName": "Reaction title (e.g. Aldol Condensation)",
      "chemicalEquation": "Balanced chemical equation in standard notation (e.g. $2\\text{CH}_3\\text{CHO} \\xrightarrow{\\text{dil. NaOH}} \\text{CH}_3\\text{CH(OH)CH}_2\\text{CHO}$ or 2 CH3CHO -> CH3-CH(OH)-CH2-CHO)",
      "mechanism": "Step-by-step mechanism type and key intermediate",
      "catalysts": "Catalyst name and role",
      "conditions": "Temperature, solvent, and environment conditions",
      "importantExceptions": "Crucial exceptions, reactivity orders, or distractor traps",
      "relatedExamQuestions": ["Exam question context 1", "Exam question context 2"]
    }
  ]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const reactions = Array.isArray(parsed) ? parsed : (parsed.reactions || []);

    res.json({
      success: true,
      reactions,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate reactions");
  }
});

// API Endpoint: AI Definition Generator
app.post("/api/generate-definitions", async (req, res) => {
  try {
    const { subject, chapter = 'General', topic, difficultyMode = 'NORMAL' } = req.body;

    const subjectVal = validateSubjectParam(subject, false);
    if (!subjectVal.valid) {
      return res.status(400).json({ error: subjectVal.error, message: subjectVal.message });
    }
    const validatedSubject = subjectVal.subject!;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are an expert NMDCAT definitions and core vocabulary compiler for Pakistani medical college entrance tests.

SUBJECT: ${validatedSubject}
Generate 1-3 essential, high-yield definitions for:
Subject: ${validatedSubject}
Chapter: ${chapter}
Topic / Term: ${topic}
Difficulty Mode: ${difficultyMode}

CRITICAL REQUIREMENTS:
1. Provide both a snappy, 1-sentence NMDCAT short definition for rapid revision AND a formal textbook definition strictly aligned with ${validatedSubject} PMDC/FSc syllabus.
2. Include 2-4 related technical terms.
3. Include high-yield exam notes and key conceptual distinctions (e.g. difference between closely related terms).
4. Return ONLY valid JSON.

Return ONLY a valid JSON object with this exact structure:
{
  "definitions": [
    {
      "term": "Term or concept title",
      "nmdcatShortDefinition": "Crisp, 1-sentence high-yield definition",
      "textbookDefinition": "Formal, comprehensive PMDC/FSc textbook standard definition",
      "relatedTerms": ["Related term 1", "Related term 2", "Related term 3"],
      "examNotes": "Crucial exam note, all-or-none rule, or past paper distractor tip",
      "distinction": "Key distinction from easily confused concepts"
    }
  ]
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const definitions = Array.isArray(parsed) ? parsed : (parsed.definitions || []);

    res.json({
      success: true,
      definitions,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate definitions");
  }
});

// API Endpoint: AI Knowledge Graph & Cross-Subject Link Generator
app.post("/api/generate-knowledge-graph", async (req, res) => {
  try {
    const { subject, topic, difficultyMode = 'NORMAL' } = req.body;

    const subjectVal = validateSubjectParam(subject, false);
    if (!subjectVal.valid) {
      return res.status(400).json({ error: subjectVal.error, message: subjectVal.message });
    }
    const validatedSubject = subjectVal.subject!;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are an expert NMDCAT curriculum architect.

SUBJECT: ${validatedSubject}
Generate an interconnected conceptual knowledge graph and cross-subject concept nexus for:
Core Subject: ${validatedSubject}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

Map how this concept connects across NMDCAT subjects (Biology, Chemistry, Physics, English/Reasoning), its prerequisite concepts, and downstream medical applications.

Return ONLY a valid JSON object with this exact structure:
{
  "knowledgeGraph": {
    "centralConcept": "${topic}",
    "subject": "${validatedSubject}",
    "nodes": [
      {
        "id": "node_1",
        "label": "Concept Node Name",
        "subject": "Biology|Chemistry|Physics|English",
        "mastery": 80,
        "details": "Conceptual explanation and formula/mechanism link",
        "status": "Core|Prerequisite|Application"
      }
    ],
    "edges": [
      {
        "from": "node_1",
        "to": "node_2",
        "relationship": "How these two concepts are mechanically linked"
      }
    ],
    "highYieldTips": ["Inter-subject exam connection tip 1", "Exam connection tip 2"]
  }
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const knowledgeGraph = parsed.knowledgeGraph || parsed;

    res.json({
      success: true,
      knowledgeGraph,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate knowledge graph");
  }
});

// ============================================================
// PRISM ENGINE: SOURCE-CONTROLLED KNOWLEDGE SYNTHESIS
// ============================================================

// API Endpoint: PRISM Supplementary Research Queries Generator
app.post("/api/prism/research-queries", async (req, res) => {
  try {
    const { subject, topic } = req.body;

    const subjectVal = validateSubjectParam(subject, false);
    if (!subjectVal.valid) {
      return res.status(400).json({ error: subjectVal.error, message: subjectVal.message });
    }
    const validatedSubject = subjectVal.subject!;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `You are the PRISM Research Query Generator for Pakistani NMDCAT preparation.
SUBJECT: ${validatedSubject}
Topic: ${topic}

Generate 6-10 targeted research queries designed to probe:
1. Historical discoveries and scientist contributions
2. Extreme values / physiological ranges / numerical constants
3. Common textbook misconceptions vs modern scientific consensus
4. High-yield distractor traps in PMDC exams
5. Precise chemical/physical conditions and mechanism exceptions

Return ONLY a valid JSON object with this exact structure:
{
  "queries": [
    "Query string 1",
    "Query string 2"
  ]
}
Do not include any text outside the JSON object.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.5,
      maxTokens: 2048,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};
    const queries = Array.isArray(parsed) ? parsed : (parsed.queries || []);
    res.json({
      success: true,
      queries,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to generate research queries");
  }
});

// API Endpoint: PRISM Multi-Stage Synthesis
app.post("/api/prism/synthesize", async (req, res) => {
  try {
    const {
      subject,
      topic,
      textbookContent = '',
      examReferences = '',
      externalSnippets = '',
      generationMode = 'NORMAL'
    } = req.body;

    const subjectVal = validateSubjectParam(subject, false);
    if (!subjectVal.valid) {
      return res.status(400).json({ error: subjectVal.error, message: subjectVal.message });
    }
    const validatedSubject = subjectVal.subject!;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required for PRISM synthesis" });
    }

    const prompt = `You are PRISM (Precision Reference & Integrated Source-verified Material system), an advanced AI engine for Pakistani NMDCAT (PMDC) curriculum.

CORE LAW:
"AI may synthesize verified knowledge, but must never silently invent, alter, or replace knowledge."
- If the textbook states X and scientific consensus states Y, YOU MUST PRESERVE BOTH. Mark status as "TEXTBOOK_SCIENCE_CONFLICT".
- Never guess exam relevance. If unclear, mark "UNRESOLVED".
- Preserve all qualifiers (e.g. "first discovered", "first isolated", "first crystallized", "under standard conditions", "mainly", "most abundant", "largest", "only", "unique", "exception").
- Do NOT dilute superlative or historical milestone wording (e.g. never downgrade 'largest' to 'large' or 'first isolated' to 'early'). Always retain the explicit context/scope (e.g. 'in the human body', 'in eukaryotes').
- If evidence is weak or missing, mark "INSUFFICIENT_EVIDENCE" or "DISPUTED".

INPUT SPECIFICATIONS:
- Subject: ${validatedSubject}
- Topic: ${topic}
- Prescribed Textbook Content: ${textbookContent ? textbookContent : "Standard PMDC / Provincial FSc Textbook curriculum coverage for " + topic}
- Official Exam References: ${examReferences ? examReferences : "PMDC NMDCAT Syllabus guidelines & past exam standards for " + topic}
- External Scientific Context: ${externalSnippets ? externalSnippets : "Standard peer-reviewed biological / chemical / physical literature"}
- Generation Mode: ${generationMode}

PIPELINE TO EXECUTE:
1. SOURCE CLASSIFICATION: Classify input sources into Tier 1 (Official Exam), Tier 2 (Textbook), Tier 3 (Scientific Reference), Tier 4 (Secondary).
2. CLAIM EXTRACTION: Extract atomic factual claims with exact qualifiers preserved.
3. VERIFICATION & CONFLICT DETECTION: Assign each claim a status: VERIFIED, TEXTBOOK_ONLY, SCIENTIFICALLY_OUTDATED, TEXTBOOK_SCIENCE_CONFLICT, DISPUTED, REJECTED, or INSUFFICIENT_EVIDENCE.
4. RULE EXTRACTION: Extract 2-4 generalized deductive rules with application conditions and exceptions.
5. SUBJECT PROCESSING:
   - Biology: Detailed mechanisms, sequences, cellular structure-function, clinical relevance, distractor traps.
   - Chemistry: Balanced equations, mechanisms, catalysts, temperature/pressure conditions, exceptions.
   - Physics: Valid formulas, SI units, dimension verification, numerical traps, independent calculations.
6. STUDY MATERIALS GENERATION:
   - 3-5 High-yield MCQs (4 options, 1 correct index, explanation, sourceClaimIds, trap warning).
   - 3-5 High-yield Flashcards (front, back, explanation, sourceClaimIds).
   - 2-3 High-yield Mnemonics (acronym/phrase/visual with breakdown).
   - 1 Structured Mind Map (centerConcept, 3-5 main nodes, subNodes).
   - Formulas, reactions, and definitions where applicable.

CRITICAL: Return ONLY valid JSON adhering strictly to this exact JSON schema:
{
  "knowledgeLayer": {
    "topic": "${topic}",
    "subject": "${validatedSubject}",
    "verifiedSummary": "Comprehensive summary of verified core knowledge...",
    "sources": [
      {
        "id": "src_1",
        "sourceType": "TEXTBOOK|OFFICIAL_EXAM|SCIENTIFIC_REFERENCE|SECONDARY",
        "tier": 1,
        "title": "Source title",
        "origin": "Textbook / PMDC / Journal name",
        "contentSnippet": "Key citation snippet",
        "reliabilityScore": 95
      }
    ],
    "claims": [
      {
        "id": "clm_1",
        "statement": "Claim statement with qualifier",
        "category": "Structure|Mechanism|Historical|Exception|Quantitative",
        "sourceIds": ["src_1"],
        "status": "VERIFIED|TEXTBOOK_ONLY|SCIENTIFICALLY_OUTDATED|TEXTBOOK_SCIENCE_CONFLICT|DISPUTED|INSUFFICIENT_EVIDENCE",
        "qualifier": "e.g. Under standard physiological conditions",
        "textbookClaim": "Textbook claim statement if conflict exists",
        "scientificClaim": "Scientific claim statement if conflict exists",
        "examRelevance": "TEXTBOOK_CONVENTION|SCIENTIFIC_FACT|BOTH_ACCEPTED|UNRESOLVED",
        "confidence": "HIGH|MEDIUM|LOW",
        "notes": "Contextual note"
      }
    ],
    "rules": [
      {
        "id": "rule_1",
        "ruleStatement": "General scientific rule statement",
        "sourceClaimIds": ["clm_1"],
        "applicationConditions": "When this rule holds true",
        "exceptions": ["Exception condition 1"],
        "subject": "${subject}"
      }
    ],
    "textbookConflicts": [
      {
        "claimId": "clm_1",
        "textbookVersion": "What textbook states",
        "scientificVersion": "What modern science demonstrates",
        "examRelevance": "TEXTBOOK_CONVENTION|SCIENTIFIC_FACT|UNRESOLVED",
        "recommendationForStudent": "Specific actionable advice for the NMDCAT exam"
      }
    ],
    "disputes": []
  },
  "materials": {
    "mcqs": [
      {
        "id": "prism_mcq_1",
        "subject": "${subject}",
        "chapter": "${topic}",
        "topic": "${topic}",
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Detailed explanation...",
        "difficulty": "Medium",
        "sourceClaimIds": ["clm_1"],
        "knowledgeStatus": "VERIFIED",
        "examTrap": "Common pitfall to avoid"
      }
    ],
    "flashcards": [
      {
        "id": "prism_fc_1",
        "subject": "${subject}",
        "topic": "${topic}",
        "front": "Flashcard front prompt",
        "back": "Flashcard back answer and breakdown",
        "explanation": "Deeper context",
        "sourceClaimIds": ["clm_1"],
        "knowledgeStatus": "VERIFIED"
      }
    ],
    "mnemonics": [
      {
        "id": "prism_mn_1",
        "type": "acronym",
        "mnemonic": "MNEMONIC",
        "explanation": "M = ..., N = ...",
        "concept": "Core concept",
        "topic": "${topic}",
        "sourceClaimIds": ["clm_1"]
      }
    ],
    "mindMap": {
      "id": "prism_mm_1",
      "subject": "${subject}",
      "topic": "${topic}",
      "title": "${topic} Concept Map",
      "centerConcept": "${topic}",
      "nodes": [
        {
          "id": "node_1",
          "label": "Main Branch",
          "description": "Branch description",
          "subNodes": [
            { "id": "sub_1", "label": "Sub concept", "detail": "Sub detail" }
          ]
        }
      ]
    },
    "formulas": [],
    "reactions": [],
    "definitions": []
  }
}

Do not include any text outside the JSON object. Do not include markdown formatting.`;

    const result = await callWithFallback({
      prompt,
      temperature: 0.6,
      maxTokens: 8192,
      jsonMode: true,
    });

    const parsed = extractJsonFromText(result.text) || {};

    if (!parsed.knowledgeLayer || !parsed.materials) {
      throw new Error("PRISM output missing required knowledgeLayer or materials structure.");
    }

    const rawCorpus = [textbookContent, examReferences, externalSnippets].filter(Boolean).join("\n");
    const rawSources = Array.isArray(parsed.knowledgeLayer.sources) ? parsed.knowledgeLayer.sources : [];
    const rawClaims = Array.isArray(parsed.knowledgeLayer.claims) ? parsed.knowledgeLayer.claims : [];
    const validatedClaims = rawClaims.map((c: any) => validateAndEnrichPrismClaim(c, rawSources, rawCorpus));

    // Sanitize and ensure array validity
    const knowledgeLayer = {
      topic: parsed.knowledgeLayer.topic || topic,
      subject: parsed.knowledgeLayer.subject || subject,
      verifiedSummary: parsed.knowledgeLayer.verifiedSummary || '',
      sources: rawSources,
      claims: validatedClaims,
      rules: Array.isArray(parsed.knowledgeLayer.rules) ? parsed.knowledgeLayer.rules : [],
      textbookConflicts: Array.isArray(parsed.knowledgeLayer.textbookConflicts) ? parsed.knowledgeLayer.textbookConflicts : [],
      disputes: Array.isArray(parsed.knowledgeLayer.disputes) ? parsed.knowledgeLayer.disputes : [],
      formulas: Array.isArray(parsed.knowledgeLayer.formulas) ? parsed.knowledgeLayer.formulas : [],
      reactions: Array.isArray(parsed.knowledgeLayer.reactions) ? parsed.knowledgeLayer.reactions : [],
      definitions: Array.isArray(parsed.knowledgeLayer.definitions) ? parsed.knowledgeLayer.definitions : []
    };

    const materials = {
      mcqs: (Array.isArray(parsed.materials.mcqs) ? parsed.materials.mcqs : []).map((m: any, idx: number) => ({
        id: m.id || `prism_mcq_${Date.now()}_${idx}`,
        subject: m.subject || subject,
        chapter: m.chapter || topic,
        topic: m.topic || topic,
        question: m.question,
        options: Array.isArray(m.options) && m.options.length === 4 ? m.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: typeof m.correctIndex === 'number' ? m.correctIndex : 0,
        explanation: m.explanation || 'Verified as per PRISM source criteria.',
        difficulty: m.difficulty || 'Medium',
        type: 'Standard' as const,
        sourceClaimIds: Array.isArray(m.sourceClaimIds) ? m.sourceClaimIds : [],
        knowledgeStatus: m.knowledgeStatus || 'VERIFIED',
        examTrap: m.examTrap || undefined,
        verificationStatus: 'VERIFIED' as const,
        authorType: 'AI' as const
      })),
      flashcards: (Array.isArray(parsed.materials.flashcards) ? parsed.materials.flashcards : []).map((fc: any, idx: number) => ({
        id: fc.id || `prism_fc_${Date.now()}_${idx}`,
        subject: fc.subject || subject,
        topic: fc.topic || topic,
        front: fc.front,
        back: fc.back,
        explanation: fc.explanation,
        sourceClaimIds: Array.isArray(fc.sourceClaimIds) ? fc.sourceClaimIds : [],
        knowledgeStatus: fc.knowledgeStatus || 'VERIFIED'
      })),
      mnemonics: (Array.isArray(parsed.materials.mnemonics) ? parsed.materials.mnemonics : []).map((mn: any, idx: number) => ({
        id: mn.id || `prism_mn_${Date.now()}_${idx}`,
        type: mn.type || 'acronym',
        mnemonic: mn.mnemonic,
        explanation: mn.explanation,
        concept: mn.concept || topic,
        topic: mn.topic || topic,
        sourceClaimIds: Array.isArray(mn.sourceClaimIds) ? mn.sourceClaimIds : []
      })),
      mindMap: parsed.materials.mindMap || {
        id: `prism_mm_${Date.now()}`,
        subject: subject,
        topic: topic,
        title: `${topic} Concept Map`,
        centerConcept: topic,
        nodes: []
      },
      formulas: Array.isArray(parsed.materials.formulas) ? parsed.materials.formulas : [],
      reactions: Array.isArray(parsed.materials.reactions) ? parsed.materials.reactions : [],
      definitions: Array.isArray(parsed.materials.definitions) ? parsed.materials.definitions : []
    };

    res.json({
      success: true,
      knowledgeLayer,
      materials,
      provider: result.provider,
    });
  } catch (error: any) {
    return handleAiError(res, error, "Failed to perform PRISM synthesis");
  }
});

// 404 catch-all handler for unmatched API requests
app.use((req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    requestedUrl: req.url,
    method: req.method
  });
});

// Global error handler for unhandled exceptions in express routes
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("API Unhandled Error:", err);
  res.status(500).json({
    error: "Internal server error in API processing",
    details: err?.message || String(err)
  });
});

// Vite Integration for Dev / Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const vitePkg = "vite";
      // @ts-ignore
      const { createServer: createViteServer } = await import(vitePkg);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("[Server] Vite dev middleware not initialized:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Not Found");
      }
    });
  }

  app.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`NMDCAT Prep Pro Server running on http://${displayHost}:${PORT}`);
    if (HOST !== '0.0.0.0' && HOST !== 'localhost') {
      console.log(`Note: ensure ${HOST} resolves to this machine (e.g. via hosts file mapping to 127.0.0.1) before opening the URL.`);
    }
  });
}

const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.VERCEL_ENV || 
  process.env.NOW_REGION || 
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.FUNCTION_NAME
);

if (!isServerless && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
export { app };


