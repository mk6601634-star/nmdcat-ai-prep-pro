import { useEffect, useRef } from 'react';
import { User } from '../lib/firebase';

const HEARTBEAT_INTERVAL_MS = 45000; // 45 seconds

/**
 * usePresenceHeartbeat:
 * Automatically dispatches periodic presence heartbeats to /api/user/heartbeat
 * and ensures a genuine session login event is logged once per browser session.
 */
export function usePresenceHeartbeat(currentUser: User | null) {
  const sessionStartedRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!currentUser) return;

    let isDisposed = false;
    const sessionKey = `nmdcat_auth_session_${currentUser.uid}`;
    const hasRecordedSession = sessionStorage.getItem(sessionKey);

    // 1. Record genuine login session event once per browser tab session
    if (!hasRecordedSession) {
      currentUser.getIdToken().then(token => {
        if (isDisposed) return;
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem(sessionKey, sessionId);

        fetch('/api/auth/record-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sessionId,
            loginMethod: currentUser.isAnonymous ? 'anonymous' : 'google_popup',
            platform: 'web',
            userAgentCategory: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile Browser' : 'Desktop Browser',
            appVersion: '1.0.0'
          })
        }).catch(err => {
          console.warn('[Presence] Notice recording session start:', err);
        });
      }).catch(() => {});
    }

    // 2. Heartbeat sender function
    const sendHeartbeat = async (status: 'online' | 'offline' = 'online') => {
      try {
        const token = await currentUser.getIdToken();
        if (isDisposed) return;
        await fetch('/api/user/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status,
            sessionStartedAt: sessionStartedRef.current,
            platform: 'web'
          })
        });
      } catch (err) {
        // Silent failure for heartbeat
      }
    };

    // Initial heartbeat on mount / login
    sendHeartbeat('online');

    // Interval heartbeat
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat('online');
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Visibility change listener (send heartbeat immediately when user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat('online');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Page unload / cleanup
    const handleBeforeUnload = () => {
      // Best-effort offline notification
      currentUser.getIdToken().then(token => {
        navigator.sendBeacon?.(
          '/api/user/heartbeat',
          new Blob([JSON.stringify({ status: 'offline', sessionStartedAt: sessionStartedRef.current })], { type: 'application/json' })
        );
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isDisposed = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);
}
