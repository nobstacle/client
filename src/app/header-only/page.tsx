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

  useEffect(() => {
    setMounted(true);
    setIsInIframe(window.self !== window.top);
  }, []);

  // Get user from extension
  useEffect(() => {
    if (!isInIframe) {
      setLoading(false);
      return;
    }

    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== 'EXTENSION_AUTH') return;

      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }

      console.log('[HeaderOnly] Extension auth received');
      
      // Use NextAuth session endpoint instead of broken token validation
      try {
        const response = await fetch('/api/auth/session');
        
        if (response.ok) {
          const sessionData = await response.json();
          
          if (sessionData?.user) {
            console.log('[HeaderOnly] ✓ User loaded:', sessionData.user.email);
            setUser(sessionData.user);
          } else {
            console.log('[HeaderOnly] No active session');
          }
        } else {
          console.log('[HeaderOnly] Session check failed');
        }
      } catch (err) {
        console.error('[HeaderOnly] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('message', handler);

    const req = () => window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
    req();
    setTimeout(req, 400);
    setTimeout(req, 1000);

    authTimeoutRef.current = setTimeout(() => {
      console.log('[HeaderOnly] Auth timeout - checking session anyway');
      
      // Check session even on timeout
      fetch('/api/auth/session')
        .then(res => res.json())
        .then(sessionData => {
          if (sessionData?.user) {
            console.log('[HeaderOnly] ✓ User found via session');
            setUser(sessionData.user);
          }
        })
        .catch(err => console.error('[HeaderOnly] Session check failed:', err))
        .finally(() => setLoading(false));
    }, 3000);

    return () => {
      window.removeEventListener('message', handler);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
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