'use client';

import { useEffect, useState } from 'react';
import ClientHeader from "../dashboard/ClientHeader";
import { SocketContextProvider } from '@/context/SocketContextProvider';

export default function HeaderOnlyPage() {
  const [mounted, setMounted] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

    // Request auth
    const req = () => window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
    req();
    setTimeout(req, 400);
    setTimeout(req, 1000);

    return () => window.removeEventListener('message', handler);
  }, [isInIframe]);

  if (!mounted) {
    return <div style={{ padding: '16px', textAlign: 'center' }}>Loading...</div>;
  }

  if (loading) {
    return (
      <div style={{ padding: '16px', background: '#fff8e1', textAlign: 'center' }}>
        Checking login...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '16px', background: '#f8d7da', textAlign: 'center', display:'flex', justifyContent:'center', alignItems:'center' }}>
        <div style={{ fontWeight: '500', color: '#721c24', marginRight:'1rem' }}>
          Not logged in
        </div>
        <button 
          onClick={() => window.open('https://nobstacle.com', '_blank')}
          style={{
            padding: '10px 18px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
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
      backendTokens: user.backendTokens // Ensure backendTokens is accessible
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  console.log('[HeaderOnly] Rendering with session:', {
    email: mockSession.user.email,
    hasBackendTokens: !!mockSession.user.backendTokens,
    atc: mockSession.user.backendTokens?.atc?.substring(0, 30) + '...'
  });

  return (
    <SocketContextProvider>
      <ClientHeader user={mockSession} />
    </SocketContextProvider>
  );
}