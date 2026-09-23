# FORENSIC DISCOVERY: ADMIN USER DIRECTORY, LOGIN ACTIVITY & ONLINE PRESENCE

**Date:** 2026-09-23  
**Status:** COMPLETED (Phase 1)

---

## 1. Executive Summary & Architecture Baseline
The NMDCAT Prep Pro application operates on a dual architecture:
- **Frontend:** React 19 SPA running in Vite, communicating with Firebase Auth SDK (client-side) and Cloud Firestore (client SDK with multi-tab offline caching).
- **Backend / API Gateway:** Express application running on Node.js locally (port 3000) and exported as a serverless function proxy (`/api`) on Vercel production.
- **Authentication & Security:** 
  - Clients authenticate via Google Sign-In (`signInWithPopup`) or seamless guest fallback (`signInAnonymously`).
  - Server endpoints verify the Firebase ID Token using Google's public RSA-SHA256 x509 certificates (`verifyFirebaseToken` in `app.ts`).
  - Role hierarchy: Root Immutable Super Admin (`mdcatquizbymehran@gmail.com`) > Secondary Admin (`/adminUsers/{uid}`) > Standard User (`user`).

---

## 2. Authentication & Admin Authorization Flow
1. **Frontend Auth Initiation:**
   - `App.tsx` attaches `onAuthStateChanged(auth, callback)`.
   - When authenticated, `firebaseUser` is populated.
   - When signed out, it creates an anonymous user session.
2. **Server Middleware (`requireFirebaseAuth` & `requireAdmin`):**
   - Extracts `Bearer <idToken>` from `Authorization` header.
   - Verifies cryptographically against `https://securetoken.google.com/nmdcat-prep-pro`.
   - `resolveUserRole`: Resolves `super_admin` if email matches `mdcatquizbymehran@gmail.com` and is verified, or queries `/adminUsers/{uid}` for secondary admins.
3. **Admin UI Gate (`AdminPlatformSuite.tsx`):**
   - Calls `GET /api/admin/role` with user's ID token to get server-verified role.
   - Only opens if `role === 'super_admin' || role === 'admin'`.

---

## 3. Existing User & Firestore Collections
- `/users/{userId}`: User profile document (name, target score, exam date, email).
- `/adminUsers/{uid}`: Firestore document specifying administrative roles.
- `/auditLogs/{docId}`: Internal content modification audit log.
- Missing:
  - Centralized Firebase Auth User directory endpoint (previously `GET /api/admin/users` only listed the `adminUsers` collection).
  - `/authLoginEvents/{eventId}`: Immutable server-recorded login event audit collection.
  - `/userPresence/{uid}`: Real-time heartbeat presence tracking.

---

## 4. Phase 2–16 Implementation Blueprint

### A. Server Endpoints to Implement (`app.ts`)
1. `GET /api/admin/users`:
   - Returns paginated list of registered users. Combines Firestore user profiles and Firebase Auth metadata.
2. `POST /api/auth/record-login`:
   - Authenticated endpoint called once per genuine session.
   - Verifies ID token on server, derives `uid`, `email`, `displayName`, `provider`, records into Firestore `/authLoginEvents/{eventId}`.
3. `POST /api/user/heartbeat`:
   - Authenticated lightweight heartbeat.
   - Derives `uid` from token, updates `/userPresence/{uid}` with `lastSeenAt = serverTimestamp()`, `status = 'online'`.
4. `GET /api/admin/login-events`:
   - Requires `requireAdmin`. Returns paginated list of `/authLoginEvents` ordered by `loginAt desc`.
5. `GET /api/admin/presence`:
   - Requires `requireAdmin`. Returns all currently active users (`lastSeenAt >= now - 2 minutes`) and recently active users.
6. `GET /api/admin/users/:uid/activity`:
   - Requires `requireAdmin`. Returns detailed account metadata, current presence, and recent login history for a specific UID.

### B. Firestore Security Rules Update (`firestore.rules`)
- Match `/authLoginEvents/{eventId}`:
  - `allow read: if isAuthenticated() && isAdminUser();`
  - `allow write: if false;` (Server writes only via REST API / Admin SDK).
- Match `/userPresence/{uid}`:
  - `allow read: if isAuthenticated() && (request.auth.uid == uid || isAdminUser());`
  - `allow write: if isAuthenticated() && request.auth.uid == uid;`

### C. Frontend Architecture (`AdminPlatformSuite.tsx`, `App.tsx`, `usePresenceHeartbeat.ts`)
1. **Duplicate Prevention:**
   - Use `sessionStorage` session token `nmdcat_session_id` to ensure a login event is recorded **only once** per session startup, never on re-renders, token refreshes, or navigation.
2. **Heartbeat Manager:**
   - 45-second heartbeat timer that pings `/api/user/heartbeat` while the tab is active/focused.
   - Sends offline indicator on `beforeunload` if feasible.
3. **Admin UI: "User Activity" Module:**
   - 3 Tabs: `[All Users]`, `[Online Now]`, `[Login History]`.
   - Real-time online badges (green pulse indicator).
   - Search, filter by provider/status, pagination.
   - User detail modal showing comprehensive login history.

---

## 5. Security & Privacy Guardrails
- No passwords, private tokens, or IP addresses stored.
- Client cannot forge `uid` or `email` (derived strictly from verified JWT on server).
- Read operations restricted to authorized `super_admin` and `admin`.
- Immutable append-only historical login logs.
