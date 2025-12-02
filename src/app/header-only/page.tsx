'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import ClientHeader from "../dashboard/ClientHeader";
import { SocketContextProvider } from '@/context/SocketContextProvider';

export default function HeaderOnlyPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [extensionAuth, setExtensionAuth] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    setIsInIframe(window.self !== window.top);
    
    // Listen for auth data from extension
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from parent window or extension
      if (event.data.type === 'EXTENSION_AUTH') {
        console.log('📨 Received auth from extension:', {
          hasCookies: !!event.data.cookies,
          hasSessionToken: !!event.data.sessionToken,
          cookieCount: event.data.cookies?.length || 0
        });
        
        setExtensionAuth(event.data);
        
        // If we have a session token but NextAuth doesn't recognize it,
        // try to refresh the session
        if (event.data.sessionToken && !session) {
          console.log('🔄 Attempting to restore session...');
          // Force NextAuth to check the session again
          window.location.reload();
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Request auth data if in iframe
    if (window.self !== window.top) {
      console.log('📤 Requesting auth from extension...');
      window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
    }

    console.log('🔐 Auth Status:', {
      status,
      hasSession: !!session,
      user: session?.user?.email || 'Not logged in',
      isInIframe: window.self !== window.top,
      url: window.location.href
    });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [session, status]);

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

  if (status === 'loading') {
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
        {extensionAuth && (
          <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.8 }}>
            Extension: {extensionAuth.cookies?.length || 0} cookies found
          </div>
        )}
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) {
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
        {extensionAuth && (
          <div style={{ fontSize: '11px', marginBottom: '10px', opacity: 0.7 }}>
            Debug: {extensionAuth.cookies?.length || 0} cookies, 
            Session token: {extensionAuth.sessionToken ? 'Found' : 'Missing'}
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
                onClick={() => window.location.reload()}
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
          ✓ {session.user?.email}
        </div>
      )}
      
      <SocketContextProvider>
        <ClientHeader user={session} />
      </SocketContextProvider>
    </div>
  );
}