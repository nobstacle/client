// Configuration
const Isproduction = true; // Set to true for production
const HEADER_URL = Isproduction
  ? 'https://nobstacle.com/header-only'
  : 'http://localhost:3000/header-only';
const HEADER_HEIGHT = '56px';
const DEBUG_MODE = false; // Set to true for debugging
let isEnabled = true;
let headerInjected = false;

// List of allowed iframe origins
const ALLOWED_IFRAME_ORIGINS = Isproduction
  ? ['https://nobstacle.com', 'https://www.nobstacle.com']
  : ['http://localhost:3000', 'http://localhost:3001'];

let originalMarginTop = 0;
let isDropdownOpen = false;
let cachedAuthData = null;
let authDataReady = false;

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
      document.getElementById('nobstacle-chat-popup')?.remove();
      document.getElementById('nobstacle-search-dropdown')?.remove();
      document.getElementById('nobstacle-recording-indicator')?.remove();
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
      pointer-events: auto !important;
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
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .recording-pulse {
      animation: pulse 1.5s ease-in-out infinite;
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
  if (!DEBUG_MODE) return;
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
  if (!DEBUG_MODE) return;
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
  if (!DEBUG_MODE) return;
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

// Pre-fetch auth data BEFORE iframe loads to prevent login flash
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

  authDataReady = true;
  addDebugLog(`Pre-fetched auth: ${cachedAuthData.sessionToken ? 'YES' : 'NO'}`);
  return cachedAuthData;
}

function createRecordingIndicator(data) {
  document.getElementById('nobstacle-recording-indicator')?.remove();

  const indicator = document.createElement('div');
  indicator.id = 'nobstacle-recording-indicator';
  indicator.style.cssText = `
    position: fixed !important;
    top: 80px !important;
    right: 20px !important;
    background: rgba(239, 68, 68, 0.95) !important;
    color: white !important;
    padding: 12px 20px !important;
    border-radius: 8px !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    font-weight: 500 !important;
    font-size: 14px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  `;

  indicator.innerHTML = `
    <div class="recording-pulse" style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
    <span>${data.text}</span>
  `;

  document.body.appendChild(indicator);
  addDebugLog('✓ Recording indicator created');
}

function createHamburgerDropdown(content) {
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
    <div id="station-dropdown-container" style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; background: #f8fafc;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: #3b5998; display: flex; align-items: center; justify-content: center;">
          <svg style="color: white; width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 11px; color: #6b7280; font-weight: 500; margin-bottom: 2px; text-transform: uppercase;">Station</div>
          <div id="station-picker-placeholder">${content.stationPickerHTML || '<div style="font-size: 15px; font-weight: 600; color: #1f2937;">Loading...</div>'}</div>
        </div>
      </div>
    </div>
    
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

  // Attach event listener to the station select if it exists
  setTimeout(() => {
    const select = dropdown.querySelector('#extension-station-select');
    if (select) {
      select.addEventListener('change', (e) => {
        const newStation = e.target.value;
        addDebugLog(`Station changed to: ${newStation}`);

        iframe.contentWindow.postMessage({
          type: 'STATION_CHANGE',
          station: newStation
        }, '*');
        dropdown.remove();
      });

      // Prevent clicks on the select from closing the dropdown
      select.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });

      select.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }, 100);

  setTimeout(() => {
    const closeHandler = (e) => {
      const iframeElement = document.getElementById('nobstacle-header-iframe');

      // Don't close if clicking inside the dropdown or on the iframe
      if (dropdown.contains(e.target) || e.target === iframeElement) {
        return;
      }

      dropdown.remove();
      iframe.contentWindow.postMessage({ type: 'HAMBURGER_CLOSED' }, '*');
      document.removeEventListener('mousedown', closeHandler);
    };
    document.addEventListener('mousedown', closeHandler);
  }, 200);  // Increased delay to ensure select listeners are attached first

  addDebugLog('✓ Hamburger dropdown created');
}

function createChatPopup(content) {
  console.log('[Content Script] ===== createChatPopup called =====');
  console.log('[Content Script] Content:', content);

  document.getElementById('nobstacle-chat-popup')?.remove();

  const iframe = document.getElementById('nobstacle-header-iframe');
  if (!iframe) {
    console.error('[Content Script] ERROR: Header iframe not found!');
    return;
  }

  console.log('[Content Script] Creating chat popup element');
  const popup = document.createElement('div');
  popup.id = 'nobstacle-chat-popup';
  popup.style.cssText = `
    position: fixed !important;
    top: ${content.position.top}px !important;
    right: ${content.position.right}px !important;
    width: ${content.position.width}px !important;
    height: ${content.position.height}px !important;
    background: white !important;
    border-radius: 12px !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
    z-index: 2147483647 !important;
    border: 1px solid #e5e7eb !important;
    overflow: hidden !important;
    animation: slideDown 0.2s ease-out !important;
    display: flex !important;
    flex-direction: column !important;
  `;

  popup.innerHTML = content.html;
  document.body.appendChild(popup);
  console.log('[Content Script] ✓ Chat popup appended to body');

  setTimeout(() => {
    console.log('[Content Script] Setting up event listeners');
    const messageInput = popup.querySelector('#chat-message-input');
    const sendButton = popup.querySelector('#chat-send-button');
    const clearButton = popup.querySelector('#chat-clear-button');
    const closeButton = popup.querySelector('#chat-close-button');

    console.log('[Content Script] Found elements:', {
      messageInput: !!messageInput,
      sendButton: !!sendButton,
      clearButton: !!clearButton,
      closeButton: !!closeButton
    });

    if (messageInput && sendButton) {
      const sendMessage = () => {
        const message = messageInput.value.trim();
        console.log('[Content Script] Sending message:', message);
        if (message) {
          iframe.contentWindow.postMessage({
            type: 'CHAT_SEND_MESSAGE',
            message: message
          }, '*');
          messageInput.value = '';
        }
      };

      sendButton.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      console.log('[Content Script] ✓ Message send listeners attached');
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        console.log('[Content Script] Clear button clicked');
        iframe.contentWindow.postMessage({ type: 'CHAT_CLEAR' }, '*');
      });
      console.log('[Content Script] ✓ Clear button listener attached');
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        console.log('[Content Script] Close button clicked');
        popup.remove();
        iframe.contentWindow.postMessage({ type: 'CHAT_POPUP_CLOSED' }, '*');
      });
      console.log('[Content Script] ✓ Close button listener attached');
    }
  }, 100);


  // Close on click outside
  setTimeout(() => {
    const closeHandler = (e) => {
      const iframeElement = document.getElementById('nobstacle-header-iframe');
      if (!popup.contains(e.target) && e.target !== iframeElement) {
        console.log('[Content Script] Click outside detected, closing popup');
        popup.remove();
        iframe.contentWindow.postMessage({ type: 'CHAT_POPUP_CLOSED' }, '*');
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    document.addEventListener('mousedown', closeHandler);
  }, 100);

  addDebugLog('✓ Chat popup created');
}

function createSearchDropdown(content) {
  document.getElementById('nobstacle-search-dropdown')?.remove();

  const iframe = document.getElementById('nobstacle-header-iframe');
  if (!iframe) return;

  const dropdown = document.createElement('div');
  dropdown.id = 'nobstacle-search-dropdown';
  dropdown.style.cssText = `
    position: fixed !important;
    top: ${content.position.top}px !important;
    right: ${content.position.right}px !important;
    background: white !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    max-height: 400px !important;
    overflow-y: auto !important;
    z-index: 2147483647 !important;
    border: 1px solid #e5e7eb !important;
    min-width: ${content.position.width}px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    animation: slideDown 0.2s ease-out !important;
  `;

  dropdown.innerHTML = content.html;
  document.body.appendChild(dropdown);

  setTimeout(() => {
    const templateItems = dropdown.querySelectorAll('[data-template-id]');
    templateItems.forEach(item => {
      const templateId = item.getAttribute('data-template-id');
      const isQrButton = item.getAttribute('data-is-qr') === 'true';

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        iframe.contentWindow.postMessage({
          type: isQrButton ? 'TEMPLATE_QR_CLICK' : 'TEMPLATE_SELECT',
          templateId: templateId
        }, '*');
        dropdown.remove();
      });
    });
  }, 100);

  setTimeout(() => {
    const closeHandler = (e) => {
      const iframeElement = document.getElementById('nobstacle-header-iframe');
      if (!dropdown.contains(e.target) && e.target !== iframeElement) {
        dropdown.remove();
        iframe.contentWindow.postMessage({ type: 'SEARCH_DROPDOWN_CLOSED' }, '*');
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    document.addEventListener('mousedown', closeHandler);
  }, 100);

  addDebugLog('✓ Search dropdown created');
}

if (typeof window.nobstacleOriginalMargin === 'undefined') {
  window.nobstacleOriginalMargin = parseInt(getComputedStyle(document.body).marginTop) || 0;
}

async function injectHeader() {
  if (document.getElementById('nobstacle-header-container')) return;

  headerInjected = true;
  addDebugLog('Starting header injection...');
  injectStyles();

  // Pre-fetch auth BEFORE creating iframe to prevent login flash
  await prefetchAuthData();

  const container = document.createElement('div');
  container.id = 'nobstacle-header-container';

  const iframe = document.createElement('iframe');
  iframe.id = 'nobstacle-header-iframe';
  iframe.src = HEADER_URL;
  iframe.allow = 'clipboard-write; microphone';

  container.appendChild(iframe);
  document.body.insertBefore(container, document.body.firstChild);

  const baseMargin = window.nobstacleOriginalMargin + parseInt(HEADER_HEIGHT);
  document.body.style.marginTop = `${baseMargin}px`;

  injectDebugPanel();
  addDebugLog('Header iframe created');

  // Send auth IMMEDIATELY when iframe loads
  iframe.onload = async () => {
    addDebugLog('Iframe loaded - sending cached auth immediately');

    if (cachedAuthData && authDataReady) {
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

    // Refresh in background
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
    if (!ALLOWED_IFRAME_ORIGINS.includes(event.origin)) {
      addDebugLog(`Blocked message from origin: ${event.origin}`);
      return;
    }

    console.log('[Content Script] ===== Message received =====');
    console.log('[Content Script] Type:', event.data.type);
    console.log('[Content Script] Origin:', event.origin);

    if (event.data.type === 'REQUEST_AUTH') {
      addDebugLog('Iframe requested auth');
      const authData = cachedAuthData || await prefetchAuthData();
      iframe.contentWindow.postMessage({
        type: 'EXTENSION_AUTH',
        sessionToken: authData.sessionToken,
        cookies: authData.cookies
      }, '*');
      addDebugLog('Auth response sent');
    }

    if (event.data.type === 'TEMPLATE_SHORTCUT_CLICK') {
      addDebugLog('Template shortcut clicked, forwarding to iframe');
      const iframe = document.getElementById('nobstacle-header-iframe');
      if (iframe) {
        iframe.contentWindow.postMessage({
          type: 'TEMPLATE_SHORTCUT_CLICK',
          id: event.data.id,
          templateType: event.data.templateType,
          refType: event.data.refType,
          tag: event.data.tag
        }, '*');
        addDebugLog('✓ Template shortcut message forwarded');
      }
    }

    if (event.data.type === 'RECORDING_INDICATOR') {
      if (event.data.show) {
        createRecordingIndicator(event.data);
      } else {
        document.getElementById('nobstacle-recording-indicator')?.remove();
      }
    }

    if (event.data.type === 'HAMBURGER_MENU') {
      if (event.data.isOpen) {
        createHamburgerDropdown(event.data.content);
      } else {
        document.getElementById('nobstacle-hamburger-dropdown')?.remove();
      }
    }

    if (event.data.type === 'CHAT_POPUP') {
      console.log('[Content Script] ===== CHAT_POPUP message received =====');
      console.log('[Content Script] isOpen:', event.data.isOpen);
      console.log('[Content Script] content:', event.data.content);
      addDebugLog('Chat popup message received');

      if (event.data.isOpen) {
        console.log('[Content Script] Calling createChatPopup');
        createChatPopup(event.data.content);
      } else {
        console.log('[Content Script] Closing chat popup');
        document.getElementById('nobstacle-chat-popup')?.remove();
      }
      console.log('[Content Script] ===== CHAT_POPUP handler complete =====');
    }

    if (event.data.type === 'CHAT_UPDATE_MESSAGES') {
      const popup = document.getElementById('nobstacle-chat-popup');
      if (popup) {
        const messagesContainer = popup.querySelector('#chat-messages-container');
        if (messagesContainer) {
          messagesContainer.innerHTML = event.data.html;
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    }

    if (event.data.type === 'SEARCH_DROPDOWN') {
      if (event.data.isOpen) {
        createSearchDropdown(event.data.content);
      } else {
        document.getElementById('nobstacle-search-dropdown')?.remove();
      }
    }

    if (event.data.type === 'STATION_PICKER_HTML') {
      const placeholder = document.getElementById('station-picker-placeholder');
      if (placeholder) {
        placeholder.outerHTML = event.data.html;
        setTimeout(() => {
          const select = document.getElementById('extension-station-select');
          if (select) {
            select.addEventListener('change', (e) => {
              const newStation = e.target.value;
              addDebugLog(`Station changed to: ${newStation}`);

              iframe.contentWindow.postMessage({
                type: 'STATION_CHANGE',
                station: newStation
              }, '*');
              document.getElementById('nobstacle-hamburger-dropdown')?.remove();
            });
          }
        }, 100);
      }
    }

    if (event.data.type === 'STATION_CHANGE') {
      const newStation = event.data.station;

      // Update URL params
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('station', newStation);

      // Push new state
      window.history.pushState({}, '', currentUrl.toString());

      // Create and dispatch a custom event for socket context
      const stationEvent = new CustomEvent('stationChanged', {
        detail: { station: newStation }
      });
      window.dispatchEvent(stationEvent);

      // Force a re-render by updating router
      if (typeof window !== 'undefined') {
        const popStateEvent = new PopStateEvent('popstate', { state: {} });
        window.dispatchEvent(popStateEvent);
      }

      message.success(`Switched to Station ${newStation}`);

      // Close the hamburger menu
      setIsHamburgerMenuOpen(false);
    }

    if (event.data.type === 'BACKEND_TOKEN') {
      addDebugLog('✓ Received backend token');
      chrome.runtime.sendMessage({
        action: 'setBackendToken',
        token: event.data.token,
        expiresIn: event.data.expiresIn
      }, (response) => {
        if (response?.success) {
          addDebugLog('✓ Token stored');
          updateBackendTokenStatus(true);
        }
      });
    }
  };

  window.addEventListener('message', handler);
  addDebugLog('✓ Header injection complete');
}