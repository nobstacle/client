// Configuration
const Isproduction = true; // Set to true for production
const HEADER_URL = Isproduction
  ? 'https://nobstacle.com/header-only'
  : 'http://localhost:3000/header-only';
const HEADER_HEIGHT = '70px';
const DEBUG_MODE = true;
let isEnabled = true;
let headerInjected = false;

// List of allowed iframe origins
const ALLOWED_IFRAME_ORIGINS = Isproduction
  ? ['https://nobstacle.com', 'https://www.nobstacle.com']
  : ['http://localhost:3000', 'http://localhost:3001'];

let originalMarginTop = 0;
let isDropdownOpen = false;
let cachedAuthData = null; // Cache auth data for faster delivery

function shouldInject() {
  const hostname = window.location.hostname;
  if (hostname.includes('nobstacle.com') || hostname === 'localhost') return false;
  if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') return false;
  return true;
}

chrome.storage.local.get(['extensionEnabled'], (result) => {
  isEnabled = result.extensionEnabled !== false;
  if (isEnabled && shouldInject()) {
    injectHeader();
  }
});

chrome.runtime.onMessage.addListener((req, sender, respond) => {
  if (req.action === 'toggle') {
    isEnabled = !isEnabled;
    chrome.storage.local.set({ extensionEnabled: isEnabled });

    if (isEnabled && !headerInjected && shouldInject()) {
      injectHeader();
      respond({ injected: true });
    } else if (!isEnabled && headerInjected) {
      document.getElementById('nobstacle-header-container')?.remove();
      document.getElementById('nobstacle-hamburger-dropdown')?.remove();
      document.body.style.marginTop = `${window.nobstacleOriginalMargin}px`;
      headerInjected = false;
      respond({ injected: false });
    }
    return true;
  }
});

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
      height: ${HEADER_HEIGHT} !important;
      z-index: 2147483647 !important;
      background: white !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
      overflow: visible !important;
    }
    #nobstacle-header-iframe {
      display: block !important;
      width: 100% !important;
      height: ${HEADER_HEIGHT} !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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

// Pre-fetch auth data
async function prefetchAuthData() {
  const cookies = await getAuthCookies();
  const sessionCookie = cookies.find(c =>
    c.name === '__Secure-next-auth.session-token' ||
    c.name === 'next-auth.session-token'
  );

  cachedAuthData = {
    sessionToken: sessionCookie?.value || null,
    cookies: cookies
  };

  addDebugLog(`Pre-fetched auth: ${cachedAuthData.sessionToken ? 'YES' : 'NO'}`);
  return cachedAuthData;
}

function createHamburgerDropdown(content) {
  // Remove existing
  document.getElementById('nobstacle-hamburger-dropdown')?.remove();

  const iframe = document.getElementById('nobstacle-header-iframe');
  if (!iframe) return;

  const iframeRect = iframe.getBoundingClientRect();

  const dropdown = document.createElement('div');
  dropdown.id = 'nobstacle-hamburger-dropdown';
  dropdown.style.cssText = `
    position: fixed !important;
    top: ${iframeRect.bottom + 8}px !important;
    right: 16px !important;
    background: white !important;
    border-radius: 12px !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
    min-width: 280px !important;
    z-index: 2147483647 !important;
    border: 1px solid #e5e7eb !important;
    overflow: hidden !important;
    animation: slideDown 0.2s ease-out !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  `;

  dropdown.innerHTML = `
    <!-- Station Dropdown -->
    <div id="station-dropdown-container" style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; background: #f8fafc;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: #3b5998; display: flex; align-items: center; justify-content: center;">
          <svg style="color: white; width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 11px; color: #6b7280; font-weight: 500; margin-bottom: 2px; text-transform: uppercase;">Station</div>
          <div id="station-picker-placeholder" style="font-size: 15px; font-weight: 600; color: #1f2937;">Loading...</div>
        </div>
      </div>
    </div>
    
    <!-- User -->
    <div style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: #e8eef7; display: flex; align-items: center; justify-content: center;">
          <svg style="color: #3b5998; width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 11px; color: #6b7280; font-weight: 500; margin-bottom: 2px; text-transform: uppercase;">User</div>
          <div style="font-size: 15px; font-weight: 600; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${content.userName || 'User Name'}</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(dropdown);

  // Request the station picker component from iframe
  iframe.contentWindow.postMessage({ type: 'REQUEST_STATION_PICKER' }, '*');

  // Close on click outside
  setTimeout(() => {
    const closeHandler = (e) => {
      const iframeElement = document.getElementById('nobstacle-header-iframe');
      if (!dropdown.contains(e.target) && e.target !== iframeElement) {
        dropdown.remove();
        iframe.contentWindow.postMessage({ type: 'HAMBURGER_CLOSED' }, '*');
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    document.addEventListener('mousedown', closeHandler);
  }, 100);

  addDebugLog('✓ Hamburger dropdown created');
}

if (typeof window.nobstacleOriginalMargin === 'undefined') {
  window.nobstacleOriginalMargin = parseInt(getComputedStyle(document.body).marginTop) || 0;
}

async function injectHeader() {
  if (document.getElementById('nobstacle-header-container')) return;

  headerInjected = true;
  addDebugLog('Starting header injection...');
  injectStyles();

  await prefetchAuthData();

  const container = document.createElement('div');
  container.id = 'nobstacle-header-container';

  const iframe = document.createElement('iframe');
  iframe.id = 'nobstacle-header-iframe';
  iframe.src = HEADER_URL;
  iframe.allow = 'clipboard-write';

  container.appendChild(iframe);
  document.body.insertBefore(container, document.body.firstChild);

  // Set initial body margin to account for fixed header
  const baseMargin = window.nobstacleOriginalMargin + parseInt(HEADER_HEIGHT);
  document.body.style.marginTop = `${baseMargin}px`;

  // injectDebugPanel();
  addDebugLog('Header iframe created');

  // Send auth IMMEDIATELY when iframe loads (using cached data)
  iframe.onload = async () => {
    addDebugLog('Iframe loaded - sending cached auth immediately');

    // Send cached data first (instant)
    if (cachedAuthData) {
      iframe.contentWindow.postMessage({
        type: 'EXTENSION_AUTH',
        sessionToken: cachedAuthData.sessionToken,
        cookies: cachedAuthData.cookies
      }, '*');
      addDebugLog('✓ Cached auth sent instantly');

      updateDebugAuth(
        !!cachedAuthData.sessionToken,
        cachedAuthData.cookies.length,
        cachedAuthData.sessionToken || ''
      );
    }

    // Then refresh in background (in case cookies changed)
    setTimeout(async () => {
      const freshAuth = await prefetchAuthData();
      iframe.contentWindow.postMessage({
        type: 'EXTENSION_AUTH',
        sessionToken: freshAuth.sessionToken,
        cookies: freshAuth.cookies
      }, '*');
      addDebugLog('✓ Fresh auth sent');
    }, 100);
  };

  // Listen for messages from iframe
  const handler = async (event) => {
    // Check origin
    if (!ALLOWED_IFRAME_ORIGINS.includes(event.origin)) {
      addDebugLog(`Blocked message from origin: ${event.origin}`);
      return;
    }

    // Handle auth requests from iframe
    if (event.data.type === 'REQUEST_AUTH') {
      addDebugLog('Iframe requested auth, responding with cached data...');

      // Use cached data if available, otherwise fetch
      const authData = cachedAuthData || await prefetchAuthData();

      iframe.contentWindow.postMessage({
        type: 'EXTENSION_AUTH',
        sessionToken: authData.sessionToken,
        cookies: authData.cookies
      }, '*');
      addDebugLog('Auth response sent');
    }

    // Hamburger menu toggle
    if (event.data.type === 'HAMBURGER_MENU') {
      const iframe = document.getElementById('nobstacle-header-iframe');
      if (!iframe) return;

      addDebugLog(`Hamburger menu ${event.data.isOpen ? 'opened' : 'closed'}`);

      if (event.data.isOpen) {
        createHamburgerDropdown(event.data.content);
      } else {
        document.getElementById('nobstacle-hamburger-dropdown')?.remove();
      }
    }

    // Handle station picker HTML from iframe
    if (event.data.type === 'STATION_PICKER_HTML') {
      const placeholder = document.getElementById('station-picker-placeholder');
      if (placeholder) {
        placeholder.outerHTML = event.data.html;
        addDebugLog('✓ Station picker injected into dropdown');
        
        // Add event listener to the select element
        setTimeout(() => {
          const select = document.getElementById('extension-station-select');
          if (select) {
            select.addEventListener('change', (e) => {
              const newStation = e.target.value;
              addDebugLog(`Station changed to: ${newStation}`);
              
              // Send message to iframe
              iframe.contentWindow.postMessage({
                type: 'STATION_CHANGE',
                station: newStation
              }, '*');
              
              // Close dropdown
              document.getElementById('nobstacle-hamburger-dropdown')?.remove();
            });
          }
        }, 100);
      }
    }

    // Dropdown handling (keeping header fixed)
    if (event.data.type === 'DROPDOWN_HEIGHT' || event.data.type === 'HAMBURGER_HEIGHT') {
      const iframe = document.getElementById('nobstacle-header-iframe');
      const container = document.getElementById('nobstacle-header-container');
      if (!iframe || !container) return;

      addDebugLog(`Dropdown ${event.data.isOpen ? 'open' : 'closed'} - keeping header at fixed height`);
    }

    // Backend token handling
    if (event.data.type === 'BACKEND_TOKEN') {
      addDebugLog('✓ Received backend token from iframe!');
      addDebugLog(`Token preview: ${event.data.token.substring(0, 40)}...`);

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