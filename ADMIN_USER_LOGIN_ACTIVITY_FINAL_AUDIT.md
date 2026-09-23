# FINAL AUDIT: ADMIN USER DIRECTORY, LOGIN ACTIVITY & PRESENCE SYSTEM

**Date:** 2026-09-23  
**Status:** COMPLETED & PRODUCTION READY  
**Deployment Target:** https://nmdcat-ai-prep-pro.vercel.app

---

## 1. System Architecture & Lifecycle

### A. Authentication & Verified Session Ingestion
1. **Client:** When a user logs in via Google popup or guest mode, `usePresenceHeartbeat` checks `sessionStorage` for `nmdcat_auth_session_{uid}`. If it's a genuine new session startup, it calls `POST /api/auth/record-login`. Normal React re-renders, token refreshes, and page navigations do **NOT** generate duplicate login events.
2. **Server Middleware:** All admin endpoints and heartbeat/login recording endpoints derive `uid`, `email`, and roles strictly from verified Firebase ID Tokens (`verifyFirebaseToken` with RS256 Google Cert caching). The client is never trusted to self-report `uid` or `email`.
3. **Firestore Collections:**
   - `/authLoginEvents/{docId}`: Immutable, append-only login records. Client write operations forbidden (`allow write: if false;`). Read access restricted to verified admins (`isAdminUser()`).
   - `/userPresence/{uid}`: Real-time heartbeat presence records. Updated every 45 seconds while tab is active. Users can only update their own doc.
   - `/adminUsers/{uid}`: Firestore document for elevated admin role privileges.
   - `/users/{userId}`: User profile documents (name, target score, email, exam date).

---

## 2. Implemented Endpoints

| Endpoint | Method | Security Gate | Purpose |
|---|---|---|---|
| `/api/auth/record-login` | `POST` | `requireFirebaseAuth` | Records verified login session into `/authLoginEvents` and marks status `online`. |
| `/api/user/heartbeat` | `POST` | `requireFirebaseAuth` | Dispatches 45-second heartbeat to `/userPresence/{uid}`. |
| `/api/admin/users` | `GET` | `requireAdmin` | Returns merged user directory (Super Admin, Admins, User profiles, Presence). |
| `/api/admin/login-events` | `GET` | `requireAdmin` | Returns paginated historical login audit log sorted newest first. |
| `/api/admin/presence` | `GET` | `requireAdmin` | Returns currently active (`lastSeenAt <= 2 min`) and recently active users. |
| `/api/admin/users/:uid/activity` | `GET` | `requireAdmin` | Returns detailed profile, current presence, and recent login history for a specific UID. |

---

## 3. UI Implementation & Components
- **`AdminUserActivityStudio.tsx`**:
  - Three dedicated sub-views: `[All Users]`, `[Online Now]`, `[Login History]`.
  - Live pulse indicators for online users.
  - Search by email, name, or UID; filter by provider (`Google`, `Anonymous`) and status (`Online`, `Offline`); sort by last sign-in or creation date.
  - User detail modal displaying account metadata, email verification status, and complete chronological login activity.
- Embedded directly in the **User & Role Control** module of `AdminPlatformSuite.tsx`.

---

## 4. Test Verification & Security Integrity
- **Unit & Logic Tests (`scratch/test_user_activity_suite.mjs`):** 3/3 passed.
  - Verified 2-minute presence expiration threshold.
  - Verified `sessionStorage` session token duplicate prevention.
  - Verified Super Admin root identity immutability and verification enforcement.
- **Production Build:** `npm run build` completed with **Exit 0** (Vite client SPA + Node.js Express server bundle).
