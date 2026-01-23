'use client';

import { useEffect, useState, useRef } from 'react';
import ClientHeader from "../dashboard/ClientHeader";
import { SocketContextProvider } from '@/context/SocketContextProvider';

export default function HeaderOnlyPage() {
  const [mounted, setMounted] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authCheckAttempts = useRef(0);

  useEffect(() => {
    setMounted(true);
    setIsInIframe(window.self !== window.top);
  }, []);

  // Function to check session
  const checkSession = async () => {
    try {
      console.log('[HeaderOnly] Checking session...');
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const sessionData = await response.json();

        if (sessionData?.user) {
          console.log('[HeaderOnly] ✓ User loaded:', sessionData.user.email);
          setUser(sessionData.user);
          setLoading(false);

          window.parent.postMessage({
            type: 'AUTH_STATUS_UPDATE',
            isAuthenticated: true,
            user: sessionData.user
          }, '*');

          return true;
        } else {
          console.log('[HeaderOnly] No active session');
          setLoading(false);
        }
      } else {
        console.log('[HeaderOnly] Session check failed:', response.status);
        setLoading(false);
      }
    } catch (err) {
      console.error('[HeaderOnly] Error checking session:', err);
      setLoading(false);
    }

    return false;
  };

  useEffect(() => {
    if (!isInIframe) {
      setLoading(false);
      return;
    }

    let authReceived = false;

    const handler = async (event: MessageEvent) => {
      if (event.data?.type === 'EXTENSION_AUTH') {
        if (authReceived) return; // Prevent duplicate processing
        authReceived = true;

        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }

        console.log('[HeaderOnly] 🔑 Extension auth received');

        // Wait a bit for cookies to be fully available
        await new Promise(resolve => setTimeout(resolve, 800));

        // Now check session
        const success = await checkSession();

        if (!success) {
          // Retry once after another delay
          console.log('[HeaderOnly] 🔄 Retrying session check...');
          await new Promise(resolve => setTimeout(resolve, 1200));
          await checkSession();
        }
      }

      if (event.data?.type === 'REFRESH_AUTH') {
        console.log('[HeaderOnly] 🔄 Auth refresh requested');
        await new Promise(resolve => setTimeout(resolve, 500));
        await checkSession();
      }
    };

    window.addEventListener('message', handler);

    // Request auth from extension (multiple times for reliability)
    const requestAuth = () => {
      console.log('[HeaderOnly] 📨 Requesting auth from extension...');
      window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
    };

    // More aggressive auth requests
    requestAuth();
    setTimeout(requestAuth, 300);
    setTimeout(requestAuth, 600);
    setTimeout(requestAuth, 1000);
    setTimeout(requestAuth, 1500);
    setTimeout(requestAuth, 2000);
    setTimeout(requestAuth, 3000);

    // Fallback timeout
    // Fallback timeout with retries
    authTimeoutRef.current = setTimeout(async () => {
      if (!authReceived) {
        console.log('[HeaderOnly] ⏱️ Auth timeout - checking session with retries');

        // Try multiple times
        for (let i = 0; i < 5; i++) {
          const success = await checkSession();
          if (success) {
            console.log('[HeaderOnly] ✅ Session found on retry', i + 1);
            break;
          }
          if (i < 4) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }, 6000); // Increased from 4s to 6s

    return () => {
      window.removeEventListener('message', handler);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [isInIframe]);

  useEffect(() => {
    if (!isInIframe) return;

    const interval = setInterval(() => {
      console.log('[HeaderOnly] 🔄 Periodic session check');
      checkSession();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isInIframe]);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div style={{
        height: '56px',
        background: '#3b5998',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          color: 'white',
          fontSize: '14px',
          opacity: 0.8
        }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        height: '56px',
        padding: '0 24px',
        background: '#3b5998',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          fontWeight: '500',
          color: 'white',
          fontSize: '14px'
        }}>
          Not logged in
        </div>
        <button
          onClick={() => window.open('https://nobstacle.com', '_blank')}
          style={{
            padding: '8px 16px',
            background: 'white',
            color: '#3b5998',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px'
          }}
        >
          Login
        </button>
      </div>
    );
  }

  const mockSession = {
    user: {
      ...user,
      backendTokens: user.backendTokens
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  return (
    <SocketContextProvider>
      <ClientHeader user={mockSession} />
    </SocketContextProvider>
  );
}