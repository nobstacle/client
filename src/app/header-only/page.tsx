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

      // Clear timeout since we received auth
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }

      const token = event.data.sessionToken;
      if (!token) {
        console.log('[HeaderOnly] No token from extension');
        setLoading(false);
        return;
      }

      console.log('[HeaderOnly] Got token, fetching user...');

      try {
        // Get user data from our API
        const response = await fetch('/api/auth/get-user-from-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: token }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[HeaderOnly] ✓ User loaded:', data.user.email);
          console.log('[HeaderOnly] Has backendTokens:', !!data.user.backendTokens);
          setUser(data.user);
        } else {
          console.log('[HeaderOnly] Failed to get user');
        }
      } catch (err) {
        console.error('[HeaderOnly] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('message', handler);

    // Request auth from extension
    const req = () => window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
    req();
    setTimeout(req, 400);
    setTimeout(req, 1000);

    // Set timeout: if no auth received after 3 seconds, stop loading
    authTimeoutRef.current = setTimeout(() => {
      console.log('[HeaderOnly] Auth timeout - no response from extension');
      setLoading(false);
    }, 3000);

    return () => {
      window.removeEventListener('message', handler);
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [isInIframe]);

  if (!mounted) {
    return null; // Don't show anything during mount
  }

  if (loading) {
    // Show minimal loading state that matches header height
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

  // Create a mock session object for ClientHeader (matching NextAuth session structure)
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