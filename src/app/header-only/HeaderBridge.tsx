'use client';

import { useEffect } from 'react';

export default function HeaderBridge() {
  useEffect(() => {
    // Notify extension when header is ready
    window.parent.postMessage({ type: 'HEADER_READY' }, '*');
    
    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'EXTENSION_READY') {
        console.log('Connected to extension');
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}