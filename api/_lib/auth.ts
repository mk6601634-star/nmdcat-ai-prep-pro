import crypto from "crypto";

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

export async function verifyAuth(req: any): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  // Allow test tokens or local testing
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Authentication required. Please sign in to access AI features." };
  }

  const idToken = authHeader.split("Bearer ")[1]?.trim();
  if (!idToken) {
    return { authenticated: false, error: "Malformed Authorization header." };
  }

  if (process.env.NODE_ENV === 'test' && idToken.startsWith('test-token-')) {
    return { authenticated: true, user: { uid: 'test-user', email: 'test@example.com' } };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "nmdcat-prep-pro";

  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");

    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const signature = Buffer.from(parts[2], "base64url");

    if (header.alg !== "RS256" || !header.kid) throw new Error("Invalid token header");

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) throw new Error("Firebase token has expired");

    const keys = await getGooglePublicCerts();
    const cert = keys[header.kid];
    if (cert) {
      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(parts[0] + "." + parts[1]);
      if (!verifier.verify(cert, signature)) {
        throw new Error("Invalid token signature");
      }
    }

    return { authenticated: true, user: payload };
  } catch (err: any) {
    return { authenticated: false, error: err?.message || "Token verification failed" };
  }
}
