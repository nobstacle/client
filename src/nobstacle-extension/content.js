// Configuration
const Isproduction = true; // Set to false for local testing
const HEADER_URL = Isproduction ? 'https://nobstacle.com/header-only' : 'http://localhost:3000/header-only';
const HEADER_HEIGHT = '70px';
const DEBUG_MODE = true;

function shouldInject() {
  if (window.location.hostname.includes('nobstacle.com')) {
    return false;
  }
  
  if (window.location.protocol === 'chrome:' || 
      window.location.protocol === 'chrome-extension:') {
    return false;
  }
  
  return true;
}

function injectStyles() {
  if (document.getElementById('nobstacle-header-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'nobstacle-header-styles';
  style.textContent = `
    #nobstacle-header-container {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      z-index: 2147483647 !important;
      background: white !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    #nobstacle-header-iframe {
      display: block !important;
      width: 100% !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
  `;
  
  document.head.appendChild(style);
}

function injectDebugPanel() {
  if (!DEBUG_MODE) return;
  
  const debugPanel = document.createElement('div');
  debugPanel.id = 'nobstacle-debug-panel';
  debugPanel.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 10px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 11px;
    z-index: 2147483646;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  
  debugPanel.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">
      🔍 Nobstacle Extension Debug
    </div>
    <div style="line-height: 1.6;">
      <div>URL: <span style="color: #81C784;">${HEADER_URL}</span></div>
      <div>Mode: <span style="color: #FFB74D;">${Isproduction ? 'PRODUCTION' : 'DEVELOPMENT'}</span></div>
      <div>Injected: <span style="color: #4CAF50;">✓ Yes</span></div>
      <div id="auth-status">Checking auth...</div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #555;">
        <button onclick="document.getElementById('nobstacle-header-iframe').contentWindow.location.reload()" 
                style="padding: 4px 8px; background: #667eea; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; margin-right: 5px;">
          Reload Header
        </button>
        <button onclick="document.getElementById('nobstacle-debug-panel').remove()" 
                style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Hide
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(debugPanel);
}

function updateDebugAuth(hasAuth, cookieCount) {
  const authStatus = document.getElementById('auth-status');
  if (authStatus) {
    authStatus.innerHTML = hasAuth 
      ? `<span style="color: #4CAF50;">✓ Auth: ${cookieCount} cookies</span>`
      : `<span style="color: #ff6b6b;">✗ No auth cookies</span>`;
  }
}

async function getAuthCookies() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ 
      action: 'getCookies',
      domain: Isproduction ? 'nobstacle.com' : 'localhost'
    }, (response) => {
      resolve(response?.cookies || []);
    });
  });
}

async function injectHeader() {
  if (document.getElementById('nobstacle-header-container')) {
    return;
  }
  
  injectStyles();
  
  const container = document.createElement('div');
  container.id = 'nobstacle-header-container';
  
  const iframe = document.createElement('iframe');
  iframe.id = 'nobstacle-header-iframe';
  
  // Remove invalid attributes
  iframe.src = HEADER_URL;
  iframe.style.cssText = `
    width: 100%;
    height: ${HEADER_HEIGHT};
    border: none;
    display: block;
    margin: 0;
    padding: 0;
  `;
  
  // Set credentials mode to include cookies (this is the correct way)
  iframe.setAttribute('credentialless', 'false');
  
  container.appendChild(iframe);
  
  // Get auth cookies and send to iframe once it loads
  iframe.onload = async () => {
    const cookies = await getAuthCookies();
    
    // Look for both production and development cookie names
    const sessionCookie = cookies.find(c => 
      c.name === 'next-auth.session-token' || 
      c.name === '__Secure-next-auth.session-token'
    );
    
    console.log('🍪 Cookies found:', cookies.length);
    console.log('🍪 All cookies:', cookies.map(c => c.name));
    console.log('🔐 Session cookie:', sessionCookie ? 'Found' : 'Not found');
    
    if (sessionCookie) {
      console.log('🔐 Session cookie details:', {
        name: sessionCookie.name,
        domain: sessionCookie.domain,
        secure: sessionCookie.secure,
        sameSite: sessionCookie.sameSite
      });
    }
    
    updateDebugAuth(!!sessionCookie, cookies.length);
    
    // Send auth data to iframe
    iframe.contentWindow.postMessage({
      type: 'EXTENSION_AUTH',
      cookies: cookies,
      sessionToken: sessionCookie?.value
    }, new URL(HEADER_URL).origin);
  };
  
  // Listen for auth requests from iframe
  window.addEventListener('message', async (event) => {
    if (event.origin !== new URL(HEADER_URL).origin) return;
    
    if (event.data.type === 'REQUEST_AUTH') {
      const cookies = await getAuthCookies();
      const sessionCookie = cookies.find(c => 
        c.name.includes('next-auth.session-token') ||
        c.name.includes('__Secure-next-auth.session-token')
      );
      
      iframe.contentWindow.postMessage({
        type: 'EXTENSION_AUTH',
        cookies: cookies,
        sessionToken: sessionCookie?.value
      }, event.origin);
    }
  });
  
  document.body.insertBefore(container, document.body.firstChild);
  adjustPageContent();
  injectDebugPanel();
  
  console.log('Nobstacle header injected');
}

function adjustPageContent() {
  if (document.body) {
    const existingMargin = parseInt(window.getComputedStyle(document.body).marginTop) || 0;
    document.body.style.marginTop = `calc(${existingMargin}px + ${HEADER_HEIGHT})`;
  }
}

function removeHeader() {
  const container = document.getElementById('nobstacle-header-container');
  if (container) {
    container.remove();
    
    const currentMargin = parseInt(window.getComputedStyle(document.body).marginTop) || 0;
    const headerHeightPx = parseInt(HEADER_HEIGHT);
    document.body.style.marginTop = `${Math.max(0, currentMargin - headerHeightPx)}px`;
  }
}

if (shouldInject()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHeader);
  } else {
    injectHeader();
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    const container = document.getElementById('nobstacle-header-container');
    if (container) {
      removeHeader();
      sendResponse({ injected: false });
    } else {
      injectHeader();
      sendResponse({ injected: true });
    }
  }
  return true;
});