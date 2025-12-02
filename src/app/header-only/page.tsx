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

  useEffect(() => {
    setMounted(true);
    setIsInIframe(window.self !== window.top);

    // Listen for auth data from extension
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'EXTENSION_AUTH') {
        console.log('📨 Received auth from extension:', {
          hasCookies: !!event.data.cookies,
          hasSessionToken: !!event.data.sessionToken,
          cookieCount: event.data.cookies?.length || 0
        });

        // If we have a session token, verify it with our backend
        if (event.data.sessionToken) {
          try {
            const response = await fetch('/api/auth/verify-extension', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionToken: event.data.sessionToken })
            });

            const data = await response.json();
            console.log('🔐 Session verification result:', data);

            if (data.authenticated) {
              setExtensionSession(data.user);
              setExtensionAuthStatus('authenticated');
            } else {
              setExtensionAuthStatus('unauthenticated');
            }
          } catch (error) {
            console.error('❌ Session verification failed:', error);
            setExtensionAuthStatus('unauthenticated');
          }
        } else {
          setExtensionAuthStatus('unauthenticated');
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Request auth data if in iframe
    if (window.self !== window.top) {
      console.log('📤 Requesting auth from extension...');
      window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    console.log('🔐 Auth Status:', {
      nextAuthStatus: status,
      hasNextAuthSession: !!session,
      extensionAuthStatus,
      hasExtensionSession: !!extensionSession,
      user: session?.user?.email || extensionSession?.email || 'Not logged in',
      isInIframe: window.self !== window.top,
    });
  }, [session, status, extensionSession, extensionAuthStatus]);

  if (!mounted) {
    return (
      <div style={{
        padding: '10px',
        background: '#f0f0f0',
        fontFamily: 'system-ui',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        Loading...
      </div>
    );
  }

  // Determine the effective auth status
  const isAuthenticated = isInIframe
    ? extensionAuthStatus === 'authenticated'
    : status === 'authenticated';

  const isLoading = isInIframe
    ? extensionAuthStatus === 'loading'
    : status === 'loading';

  const effectiveSession = isInIframe
    ? (extensionSession ? { user: extensionSession, expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() } : null)
    : session;

  if (isLoading) {
    return (
      <div style={{
        padding: '15px',
        background: '#fff3cd',
        fontFamily: 'system-ui',
        fontSize: '14px',
        textAlign: 'center',
        borderBottom: '2px solid #ffc107'
      }}>
        🔄 Checking authentication...
        {isInIframe && (
          <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.8 }}>
            Waiting for extension data...
          </div>
        )}
      </div>
    );
  }

  if (!isAuthenticated || !effectiveSession) {
    return (
      <div style={{
        padding: '15px',
        background: '#f8d7da',
        fontFamily: 'system-ui',
        fontSize: '14px',
        textAlign: 'center',
        borderBottom: '2px solid #dc3545'
      }}>
        <div style={{ marginBottom: '10px' }}>
          🔒 Not logged in
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div style={{ fontSize: '11px', marginBottom: '10px', opacity: 0.7 }}>
            Debug: NextAuth={status}, Extension={extensionAuthStatus}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isInIframe ? (
            <>
              <button
                onClick={() => window.open('https://nobstacle.com', '_blank')}
                style={{
                  padding: '8px 16px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Open Nobstacle & Login
              </button>
              <button
                onClick={() => {
                  window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
                  window.location.reload();
                }}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Refresh
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn()}
              style={{
                padding: '8px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
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
          position: 'absolute',
          top: '5px',
          right: '5px',
          padding: '3px 8px',
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          fontSize: '11px',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          ✓ {effectiveSession?.user?.email || 'Authenticated'}
          {isInIframe && ' (Extension)'}
        </div>
      )}

      <SocketContextProvider>
        <ClientHeader user={effectiveSession} />
      </SocketContextProvider>
    </div>
  );
}