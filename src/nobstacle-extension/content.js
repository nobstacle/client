// Configuration
const Isproduction = true; // Set to true for production
const HEADER_URL = Isproduction
  ? 'https://nobstacle.com/header-only'
  : 'http://localhost:3000/header-only';
const HEADER_HEIGHT = '70px';
const DEBUG_MODE = true;

// List of allowed iframe origins
const ALLOWED_IFRAME_ORIGINS = Isproduction
  ? ['https://nobstacle.com', 'https://www.nobstacle.com']
  : ['http://localhost:3000', 'http://localhost:3001'];

let originalMarginTop = 0;
let isDropdownOpen = false;

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
      overflow: visible !important; /* Add this */
    }
    #nobstacle-header-iframe {
      display: block !important;
      width: 100% !important;
      height: ${HEADER_HEIGHT} !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important; /* Add this */
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
    <div id="backend-token-status" style="margin-top:4px; color:#FFB74D;">Backend token: Waiting...</div>
    <div id="token-preview" style="margin-top:8px; font-size:10px; color:#FFB74D;"></div>
    <div id="debug-log" style="margin-top:10px; max-height:150px; overflow-y:auto; font-size:10px; border-top:1px solid #555; padding-top:8px;"></div>
    <div style="margin-top:10px; padding-top:10px; border-top:1px solid #555; display:flex; gap:8px;">
      <button onclick="location.reload()" style="padding:5px 10px; background:#667eea; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">
        Reload Page
      </button>
      <button onclick="this.parentElement.parentElement.remove()" style="padding:5px 10px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px;">
        Hide
      </button>
    </div>
  `;
  document.body.appendChild(panel);
}

function addDebugLog(message) {
  const logEl = document.getElementById('debug-log');
  if (logEl) {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.textContent = `${time}: ${message}`;
    entry.style.marginBottom = '4px';
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }
  console.log('[Nobstacle Extension]', message);
}

function updateDebugAuth(hasAuth, count, tokenPreview = '') {
  const el = document.getElementById('auth-status');
  if (el) {
    el.innerHTML = hasAuth
      ? `<span style="color:#4CAF50;">✓ Authenticated: ${count} cookies</span>`
      : `<span style="color:#ff6b6b;">✗ No session cookie</span>`;
  }

  const tokenEl = document.getElementById('token-preview');
  if (tokenEl && tokenPreview) {
    tokenEl.innerHTML = `Token: ${tokenPreview.substring(0, 40)}...`;
  }
}

function updateBackendTokenStatus(hasToken) {
  const el = document.getElementById('backend-token-status');
  if (el) {
    el.innerHTML = hasToken
      ? '<span style="color:#4CAF50;">✓ Backend token stored</span>'
      : '<span style="color:#ff6b6b;">⚠ No backend token</span>';
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

if (typeof window.nobstacleOriginalMargin === 'undefined') {
  window.nobstacleOriginalMargin = parseInt(getComputedStyle(document.body).marginTop) || 0;
}

async function injectHeader() {
  if (document.getElementById('nobstacle-header-container')) return;

  addDebugLog('Starting header injection...');
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

  iframe.style.height = HEADER_HEIGHT;
  container.style.height = HEADER_HEIGHT;

  const baseMargin = window.nobstacleOriginalMargin + parseInt(HEADER_HEIGHT);
  document.body.style.marginTop = `${baseMargin}px`;

  // injectDebugPanel();
  addDebugLog('Header iframe created');

  // Send auth when iframe loads
  iframe.onload = async () => {
    addDebugLog('Iframe loaded, fetching cookies...');

    const cookies = await getAuthCookies();
    const sessionCookie = cookies.find(c =>
      c.name === '__Secure-next-auth.session-token' ||
      c.name === 'next-auth.session-token'
    );

    addDebugLog(`Found ${cookies.length} cookies`);

    if (sessionCookie) {
      addDebugLog(`Session cookie: ${sessionCookie.name}`);
      addDebugLog(`Token length: ${sessionCookie.value.length} chars`);
    } else {
      addDebugLog('No session cookie found!');
    }

    updateDebugAuth(!!sessionCookie, cookies.length, sessionCookie?.value || '');

    // Send message to iframe
    addDebugLog('Sending EXTENSION_AUTH message to iframe...');
    iframe.contentWindow.postMessage({
      type: 'EXTENSION_AUTH',
      sessionToken: sessionCookie?.value || null,
      cookies: cookies
    }, '*');
    addDebugLog('Message sent!');
  };

  function updateBodyMargin(extraHeight = 0) {
    if (!originalMarginTop) {
      originalMarginTop = parseInt(getComputedStyle(document.body).marginTop) || 0;
    }

    const baseHeight = parseInt(HEADER_HEIGHT);
    const totalHeight = baseHeight + extraHeight;
    document.body.style.marginTop = `${originalMarginTop + totalHeight}px`;
  }

  // Listen for messages from iframe
  const handler = async (event) => {
    // Check origin
    if (!ALLOWED_IFRAME_ORIGINS.includes(event.origin)) {
      addDebugLog(`Blocked message from origin: ${event.origin}`);
      return;
    }

    // Handle auth requests from iframe
    if (event.data.type === 'REQUEST_AUTH') {
      addDebugLog('Iframe requested auth, responding...');
      const cookies = await getAuthCookies();
      const sessionCookie = cookies.find(c =>
        c.name.includes('next-auth.session-token')
      );

      iframe.contentWindow.postMessage({
        type: 'EXTENSION_AUTH',
        sessionToken: sessionCookie?.value || null,
        cookies: cookies
      }, '*');
      addDebugLog('Auth response sent');
    }

    if (event.data.type === 'DROPDOWN_HEIGHT' || event.data.type === 'HAMBURGER_HEIGHT') {
      const iframe = document.getElementById('nobstacle-header-iframe');
      const container = document.getElementById('nobstacle-header-container');
      if (!iframe || !container) return;

      const isOpen = event.data.isOpen;
      const newHeight = isOpen ? event.data.height : parseInt(HEADER_HEIGHT);

      addDebugLog(`Dropdown ${isOpen ? 'open' : 'closed'} → ${newHeight}px`);

      iframe.style.transition = 'height 0.22s ease-out';
      container.style.transition = 'height 0.22s ease-out';
      iframe.style.height = newHeight + 'px';
      container.style.height = newHeight + 'px';

      // Push page down only by the *extra* height
      const extra = newHeight - parseInt(HEADER_HEIGHT);
      const finalMargin = window.nobstacleOriginalMargin + parseInt(HEADER_HEIGHT) + extra;
      document.body.style.marginTop = finalMargin + 'px';
    }

    // *** CRITICAL: Receive backend token from iframe ***
    if (event.data.type === 'BACKEND_TOKEN') {
      addDebugLog('✓ Received backend token from iframe!');
      addDebugLog(`Token preview: ${event.data.token.substring(0, 40)}...`);

      // Send to background script for storage and injection
      chrome.runtime.sendMessage({
        action: 'setBackendToken',
        token: event.data.token,
        expiresIn: event.data.expiresIn
      }, (response) => {
        if (response?.success) {
          addDebugLog('✓ Backend token stored in background script');
          updateBackendTokenStatus(true);
        } else {
          addDebugLog('✗ Failed to store backend token');
          updateBackendTokenStatus(false);
        }
      });
    }
  };

  window.addEventListener('message', handler);

  addDebugLog('✓ Header injection complete');
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