'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import ClientHeader from "../dashboard/ClientHeader";
import { SocketContextProvider } from '@/context/SocketContextProvider';

export default function HeaderOnlyPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [extensionSession, setExtensionSession] = useState<any>(null);
  const [extensionAuthStatus, setExtensionAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  // 1. Mount + detect iframe
  useEffect(() => {
    setMounted(true);
    setIsInIframe(window.self !== window.top);
  }, []);

  // 2. LISTEN FOR AUTH FROM EXTENSION — THIS IS THE FINAL WORKING VERSION
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      // SUPER LOOSE BUT SAFE: accept message if it looks like ours
      const origin = event.origin || '';
      const isFromNobstacle = origin.includes('nobstacle.com') || origin.includes('localhost');
      const isNullOrigin = origin === '' || origin === 'null';

      // When content script uses postMessage(..., '*'), event.origin can be 'null'
      if (!isFromNobstacle && !isNullOrigin) {
        console.log('Blocked message from origin:', origin);
        return;
      }

      if (event.data?.type !== 'EXTENSION_AUTH') return;

      console.log('EXTENSION_AUTH RECEIVED!', {
        hasToken: !!event.data.sessionToken,
        origin
      });

      // If no token → unauthenticated
      if (!event.data.sessionToken) {
        setExtensionAuthStatus('unauthenticated');
        return;
      }

      try {
        const res = await fetch('/api/auth/verify-extension', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: event.data.sessionToken })
        });

        const data = await res.json();
        console.log('Session verified:', data);

        if (data.authenticated && data.user) {
          setExtensionSession(data.user);
          setExtensionAuthStatus('authenticated');
        } else {
          setExtensionAuthStatus('unauthenticated');
        }
      } catch (err) {
        console.error('Session verify failed:', err);
        setExtensionAuthStatus('unauthenticated');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // 3. Request auth from extension (only in iframe)
  useEffect(() => {
    if (!isInIframe) return;

    const requestAuth = () => {
      window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*'); // Use "*" — safest
    };

    requestAuth();
    const t1 = setTimeout(requestAuth, 400);
    const t2 = setTimeout(requestAuth, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isInIframe]);

  // 4. Debug logging
  useEffect(() => {
    console.log('Auth Status:', {
      nextAuthStatus: status,
      extensionAuthStatus,
      isInIframe,
      user: session?.user?.email || extensionSession?.email || 'Not logged in'
    });
  }, [status, extensionAuthStatus, session, extensionSession, isInIframe]);

  if (!mounted) {
    return <div style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>Loading...</div>;
  }

  const isLoading = isInIframe
    ? extensionAuthStatus === 'loading'
    : status === 'loading';

  const isAuthenticated = isInIframe
    ? extensionAuthStatus === 'authenticated'
    : status === 'authenticated';

  const effectiveSession = isInIframe
    ? { user: extensionSession, expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
    : session;

  if (isLoading) {
    return (
      <div style={{
        padding: '16px',
        background: '#fff8e1',
        color: '#856404',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500',
        borderBottom: '3px solid #ffc107'
      }}>
        Checking login status...
      </div>
    );
  }

  if (!isAuthenticated || !effectiveSession?.user) {
    return (
      <div style={{
        padding: '16px',
        background: '#f8d7da',
        color: '#721c24',
        textAlign: 'center',
        borderBottom: '3px solid #dc3545'
      }}>
        <div style={{ marginBottom: '12px', fontWeight: '500' }}>
          Not logged in
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.open('https://nobstacle.com', '_blank')}
            style={{
              padding: '10px 18px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Open Nobstacle & Login
          </button>
          <button
            onClick={() => window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*')}
            style={{
              padding: '10px 18px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <SocketContextProvider>
      <ClientHeader user={effectiveSession} />
    </SocketContextProvider>
  );
}