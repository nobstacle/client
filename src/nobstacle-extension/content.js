// Configuration
const Isproduction = true; // Set to false for local testing
const HEADER_URL = Isproduction 
  ? 'https://nobstacle.com/header-only' 
  : 'http://localhost:3000/header-only';
const HEADER_HEIGHT = '70px';
const DEBUG_MODE = true;

// List of allowed iframe origins (handles www, non-www, localhost)
const ALLOWED_IFRAME_ORIGINS = Isproduction
  ? ['https://nobstacle.com', 'https://www.nobstacle.com']
  : ['http://localhost:3000', 'http://localhost:3001'];

function shouldInject() {
  const hostname = window.location.hostname;
  if (hostname.includes('nobstacle.com') || hostname === 'localhost') return false;
  if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') return false;
  return true;
}

function injectStyles() {
  if (document.getElementById('nobstacle-header-styles')) return;

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
    }
    #nobstacle-header-iframe {
      display: block !important;
      width: 100% !important;
      height: ${HEADER_HEIGHT} !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

function injectDebugPanel() {
  if (!DEBUG_MODE) return;

  const panel = document.createElement('div');
  panel.id = 'nobstacle-debug-panel';
  panel.style.cssText = `
    position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.9); color: white;
    padding: 12px; border-radius: 8px; font-family: monospace; font-size: 11px;
    z-index: 2147483646; max-width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  `;
  panel.innerHTML = `
    <div style="font-weight:bold; color:#4CAF50; margin-bottom:8px;">Nobstacle Debug</div>
    <div>URL: <span style="color:#81C784;">${HEADER_URL}</span></div>
    <div>Mode: <span style="color:#FFB74D;">${Isproduction ? 'PROD' : 'DEV'}</span></div>
    <div id="auth-status">Checking cookies...</div>
    <div style="margin-top:10px; padding-top:10px; border-top:1px solid #555; display:flex; gap:8px;">
      <button onclick="location.reload()" style="padding:5px 10px; background:#667eea; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">
        Reload Page
      </button>
      <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding:5px 10px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">
        Hide
      </button>
    </div>
  `;
  document.body.appendChild(panel);
}

function updateDebugAuth(hasAuth, count) {
  const el = document.getElementById('auth-status');
  if (el) {
    el.innerHTML = hasAuth
      ? `<span style="color:#4CAF50;">Authenticated: ${count} cookies</span>`
      : `<span style="color:#ff6b6b;">No session cookie</span>`;
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
  if (document.getElementById('nobstacle-header-container')) return;

  injectStyles();

  const container = document.createElement('div');
  container.id = 'nobstacle-header-container';

  const iframe = document.createElement('iframe');
  iframe.id = 'nobstacle-header-iframe';
  iframe.src = HEADER_URL;
  iframe.style.cssText = `width:100%; height:${HEADER_HEIGHT}; border:none;`;
  iframe.allow = 'clipboard-write';

  container.appendChild(iframe);
  document.body.insertBefore(container, document.body.firstChild);

  // Adjust page margin
  const existing = parseInt(getComputedStyle(document.body).marginTop) || 0;
  document.body.style.marginTop = `${existing + parseInt(HEADER_HEIGHT)}px`;

  injectDebugPanel();

  // Send auth when iframe loads
  iframe.onload = async () => {
    const cookies = await getAuthCookies();
    const sessionCookie = cookies.find(c =>
      c.name === '__Secure-next-auth.session-token' ||
      c.name === 'next-auth.session-token'
    );

    console.log('Extension → iframe: Sending auth data', { hasToken: !!sessionCookie });
    updateDebugAuth(!!sessionCookie, cookies.length);

    // CRITICAL FIX: Use "*" — never trust origin calculation with www/localhost
    iframe.contentWindow.postMessage({
      type: 'EXTENSION_AUTH',
      sessionToken: sessionCookie?.value || null,
      cookies: cookies
    }, '*');
  };

  // Listen for auth requests from iframe
  const handler = async (event) => {
    // Allow both www and non-www + localhost
    if (!ALLOWED_IFRAME_ORIGINS.includes(event.origin)) {
      console.log('Blocked message from origin:', event.origin);
      return;
    }

    if (event.data.type === 'REQUEST_AUTH') {
      console.log('Iframe requested auth → responding');
      const cookies = await getAuthCookies();
      const sessionCookie = cookies.find(c =>
        c.name.includes('next-auth.session-token')
      );

      iframe.contentWindow.postMessage({
        type: 'EXTENSION_AUTH',
        sessionToken: sessionCookie?.value || null,
        cookies: cookies
      }, '*'); // ← Always use "*" here
    }
  };

  window.addEventListener('message', handler);

  console.log('Nobstacle header injected successfully');
}

// Toggle support
chrome.runtime.onMessage.addListener((req, sender, respond) => {
  if (req.action === 'toggle') {
    if (document.getElementById('nobstacle-header-container')) {
      document.getElementById('nobstacle-header-container')?.remove();
      document.body.style.marginTop = '';
      respond({ injected: false });
    } else {
      injectHeader();
      respond({ injected: true });
    }
    return true;
  }
});

// Inject on load
if (shouldInject()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHeader);
  } else {
    injectHeader();
  }
}