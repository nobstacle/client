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

  // Get user from extension
  useEffect(() => {
    if (!isInIframe) {
      setLoading(false);
      return;
    }

    const handler = async (event: MessageEvent) => {
      // Handle extension auth
      if (event.data?.type === 'EXTENSION_AUTH') {
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }

        console.log('[HeaderOnly] 🔑 Extension auth received');
        
        // Extension sent auth - check session immediately
        const success = await checkSession();
        
        if (!success) {
          // If session check failed, try again after a short delay
          // (cookies might still be syncing)
          console.log('[HeaderOnly] 🔄 Retrying session check...');
          setTimeout(async () => {
            const retrySuccess = await checkSession();
            if (!retrySuccess) {
              console.log('[HeaderOnly] ❌ Session check failed after retry');
              setLoading(false);
            }
          }, 500);
        }
      }
      
      // NEW: Handle auth refresh request
      if (event.data?.type === 'REFRESH_AUTH') {
        console.log('[HeaderOnly] 🔄 Auth refresh requested');
        await checkSession();
      }
    };

    window.addEventListener('message', handler);

    // Request auth from extension
    const requestAuth = () => {
      console.log('[HeaderOnly] 📨 Requesting auth from extension...');
      window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
    };
    
    requestAuth();
    setTimeout(requestAuth, 400);
    setTimeout(requestAuth, 1000);

    // Timeout fallback - check session anyway
    authTimeoutRef.current = setTimeout(async () => {
      console.log('[HeaderOnly] ⏱️ Auth timeout - checking session anyway');
      await checkSession();
      setLoading(false);
    }, 3000);

    return () => {
      window.removeEventListener('message', handler);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [isInIframe]);

  // NEW: Periodic session check (every 30 seconds)
  // This helps detect login changes
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
        height: '70px',
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
        height: '70px',
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