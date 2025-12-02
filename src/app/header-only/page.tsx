'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import ClientHeader from "../dashboard/ClientHeader";
import { SocketContextProvider } from '@/context/SocketContextProvider';

export default function HeaderOnlyPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsInIframe(window.self !== window.top);
    
    // Debug: Log auth status
    console.log('🔐 Auth Status:', {
      status,
      hasSession: !!session,
      user: session?.user?.email || 'Not logged in',
      isInIframe: window.self !== window.top,
      url: window.location.href
    });
  }, [session, status]);

  // Don't render anything during SSR or initial mount
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

  // Show loading state
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
      </div>
    );
  }

  // Show login prompt if not authenticated
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

  // Authenticated - show header
  return (
    <div style={{ position: 'relative' }}>
      {/* Optional: Show logged in indicator in dev mode */}
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