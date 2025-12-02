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

  // 1. Mount + detect iframe + send initial requests
  useEffect(() => {
    setMounted(true);
    const inIframe = window.self !== window.top;
    setIsInIframe(inIframe);

    if (inIframe) {
      const send = () => window.parent.postMessage(
        { type: 'REQUEST_AUTH' },
        'https://nobstacle.com'
      );
      send();
      setTimeout(send, 300);
      setTimeout(send, 900);
    }
  }, []);

  // 2. Listen for auth from extension (CRITICAL — was missing!)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== 'https://nobstacle.com' && event.origin !== 'http://localhost:3000') return;
      if (event.data.type !== 'EXTENSION_AUTH') return;

      const { sessionToken } = event.data;

      if (!sessionToken) {
        setExtensionAuthStatus('unauthenticated');
        return;
      }

      try {
        const res = await fetch('/api/auth/verify-extension', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });
        const data = await res.json();

        if (data.authenticated && data.user) {
          setExtensionSession(data.user); // assuming your API returns full user
          setExtensionAuthStatus('authenticated');
        } else {
          setExtensionAuthStatus('unauthenticated');
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
        setExtensionAuthStatus('unauthenticated');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 3. Safe retry if still loading
  useEffect(() => {
    if (!isInIframe || extensionAuthStatus !== 'loading') return;

    let attempts = 0;
    const max = 6;

    const retry = () => {
      if (extensionAuthStatus !== 'loading') return;
      attempts++;
      window.parent.postMessage({ type: 'REQUEST_AUTH' }, 'https://nobstacle.com');
      if (attempts < max) {
        setTimeout(retry, 2000 * attempts);
      }
    };

    const timer = setTimeout(retry, 2500);
    return () => clearTimeout(timer);
  }, [isInIframe, extensionAuthStatus]);

  // 4. Debug log
  useEffect(() => {
    console.log('Auth Status:', {
      nextAuthStatus: status,
      extensionAuthStatus,
      isInIframe,
      user: session?.user?.email || extensionSession?.email || 'Not logged in'
    });
  }, [status, extensionAuthStatus, session, extensionSession, isInIframe]);

  if (!mounted) {
    return <div style={{ padding: '10px', background: '#f0f0f0', textAlign: 'center', fontSize: '12px' }}>Loading...</div>;
  }

  // FIXED: Proper loading & auth logic
  const isLoading = isInIframe
    ? extensionAuthStatus === 'loading'
    : status === 'loading';

  const isAuthenticated = isInIframe
    ? extensionAuthStatus === 'authenticated'
    : status === 'authenticated';

  const effectiveSession = isInIframe
    ? { user: extensionSession, expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() } // wrap to match NextAuth shape
    : session;

  if (isLoading) {
    return (
      <div style={{ padding: '15px', background: '#fff3cd', textAlign: 'center', borderBottom: '2px solid #ffc107' }}>
        Checking authentication...
        {isInIframe && <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.8 }}>Waiting for extension...</div>}
      </div>
    );
  }

  if (!isAuthenticated || !effectiveSession?.user) {
    return (
      <div style={{ padding: '15px', background: '#f8d7da', textAlign: 'center', borderBottom: '2px solid #dc3545' }}>
        <div style={{ marginBottom: '10px' }}>Not logged in</div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isInIframe ? (
            <>
              <button onClick={() => window.open('https://nobstacle.com', '_blank')}
                style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Open Nobstacle & Login
              </button>
              <button onClick={() => {
                window.parent.postMessage({ type: 'REQUEST_AUTH' }, 'https://nobstacle.com');
                alert('Checking again...');
              }}
                style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Retry Auth
              </button>
            </>
          ) : (
            <button onClick={() => signIn()}
              style={{ padding: '8px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Sign In
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute', top: '5px', right: '5px', background: '#d4edda', padding: '3px 8px',
          borderRadius: '4px', fontSize: '11px', border: '1px solid #c3e6cb'
        }}>
          ✓ {effectiveSession.user.email} {isInIframe && '(Extension)'}
        </div>
      )}
      <SocketContextProvider>
        <ClientHeader user={effectiveSession} />
      </SocketContextProvider>
    </div>
  );
}