// Configuration
const Isproduction = true;
const HEADER_URL = Isproduction
  ? 'https://nobstacle.com/header-only'
  : 'http://localhost:3000/header-only';
const HEADER_HEIGHT = '56px';
const DEBUG_MODE = false;
const STATION_STORAGE_KEY = 'nobstacle_selected_station';

let isEnabled = true;
let headerInjected = false;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let selectedCategory = null;
let categoriesData = [];
let categoriesFetched = false;
let selectedStation = null;
let stationLoadedFromStorage = false;
let loginPromptShown = false;
let loginCheckInProgress = false;
let loginWindowOpened = false;

// Special handler for nobstacle.com - IMPROVED VERSION
const isNobstacleWebsite = window.location.hostname === 'nobstacle.com' ||
  window.location.hostname === 'www.nobstacle.com' ||
  window.location.hostname.endsWith('.nobstacle.com');

if (isNobstacleWebsite) {
  console.log('[Nobstacle Content] 🌐 Running on nobstacle.com');
  console.log('[Nobstacle Content]   Hostname:', window.location.hostname);

  // Function to send auth to background
  const sendAuthToBackground = async () => {
    try {
      console.log('[Nobstacle Content] 🔍 Checking authentication...');

      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      console.log('[Nobstacle Content] Session response status:', response.status);

      if (response.ok) {
        const sessionData = await response.json();
        console.log('[Nobstacle Content] Session data:', sessionData);

        if (sessionData && sessionData.user) {
          console.log('[Nobstacle Content] ✅ User logged in:', sessionData.user.email);

          chrome.runtime.sendMessage({
            action: 'authCookiesFromNobstacle',
            cookies: [],
            sessionData: sessionData,
            user: sessionData.user,
            timestamp: Date.now()
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[Nobstacle Content] ❌ Error:', chrome.runtime.lastError);
            } else {
              console.log('[Nobstacle Content] ✅ Auth data sent to background');
            }
          });

          return true;
        }
      }
    } catch (error) {
      console.error('[Nobstacle Content] ❌ Error:', error);
    }
    return false;
  };

  // Send auth on multiple triggers
  console.log('[Nobstacle Content] 🚀 Sending initial auth check...');
  setTimeout(() => sendAuthToBackground(), 500);
  setTimeout(() => sendAuthToBackground(), 2000);
  setTimeout(() => sendAuthToBackground(), 5000);

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchAuthCookies') {
      sendAuthToBackground().then(success => sendResponse({ success }));
      return true;
    }
  });

  console.log('[Nobstacle Content] ✅ Auth monitoring initialized');

  // STOP HERE - don't run the rest of the script
}

function debugStorage() {
  console.log('[Content Script] 🔍 Storage Debug:');
  console.log('  localStorage:', localStorage.getItem(STATION_STORAGE_KEY));

  chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
    console.log('  Chrome storage:', result[STATION_STORAGE_KEY]);
  });
}

// List of allowed iframe origins
const ALLOWED_IFRAME_ORIGINS = Isproduction
  ? ['https://nobstacle.com', 'https://www.nobstacle.com']
  : ['http://localhost:3000', 'http://localhost:3001'];

// if (typeof window.nobstacleOriginalMargin === 'undefined') {
//   window.nobstacleOriginalMargin = parseInt(getComputedStyle(document.body).marginTop) || 0;
// }

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

function showLoader() {
  document.getElementById('nobstacle-loader')?.remove();
  document.getElementById('nobstacle-login-prompt')?.remove();

  const loader = document.createElement('div');
  loader.id = 'nobstacle-loader';
  loader.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 56px !important;
    background: #3b5998 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 2147483647 !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
  `;

  loader.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; color: white;">
      <div style="
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      "></div>
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 500;">
        Loading Nobstacle...
      </span>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;

  // document.body.insertBefore(loader, document.body.firstChild);
  if (document.body.firstChild) {
    document.body.insertBefore(loader, document.body.firstChild);
  } else {
    document.body.appendChild(loader);
  }
}

function hideLoader() {
  const loader = document.getElementById('nobstacle-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s ease';
    setTimeout(() => loader.remove(), 300);
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    // Listen for station changes
    if (changes[STATION_STORAGE_KEY]) {
      const newStation = changes[STATION_STORAGE_KEY].newValue;
      console.log('[Content Script] 📡 Station changed in storage:', newStation);

      selectedStation = String(newStation);
      localStorage.setItem(STATION_STORAGE_KEY, newStation);

      const iframe = document.getElementById('nobstacle-header-iframe');
      if (iframe && iframe.src.includes('station=')) {
        const newUrl = iframe.src.replace(/station=[^&]*/, `station=${newStation}`);
        console.log('[Content Script] 🔄 Reloading iframe with new station');
        iframe.src = newUrl;
      }
    }

    // IMPROVED: Listen for auth status changes
    if (changes.isAuthenticated) {
      const newAuthStatus = changes.isAuthenticated.newValue;
      console.log('[Content Script] 🔔 Auth status changed in storage:', newAuthStatus);

      if (newAuthStatus === true) {
        const newToken = changes.authSessionToken?.newValue;
        const newCookies = changes.authCookies?.newValue || [];

        if (newToken) {
          console.log('[Content Script] ✅ User authenticated - updating cache');

          // Update cached auth data
          cachedAuthData = {
            sessionToken: newToken,
            cookies: newCookies,
            isAuthenticated: true
          };
          authDataReady = true;

          // Remove login prompt if showing
          const loginPrompt = document.getElementById('nobstacle-login-prompt');
          if (loginPrompt) {
            loginWindowOpened = false; // Reset flag

            loginPrompt.innerHTML = `
              <div style="margin-bottom: 20px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2 style="margin: 0 0 10px 0; color: #10b981; font-size: 20px; font-weight: 600;">Login Successful!</h2>
              <p style="margin: 0; color: #666; font-size: 14px;">Loading extension...</p>
            `;

            setTimeout(() => {
              loginPrompt.remove();
            }, 1500);
          }

          // Remove loader
          document.getElementById('nobstacle-loader')?.remove();

          // Inject or refresh header
          if (!headerInjected && shouldInject()) {
            console.log('[Content Script] 🚀 Injecting header after auth detected');
            setTimeout(() => {
              injectHeader();
            }, 1500);
          } else if (headerInjected) {
            const iframe = document.getElementById('nobstacle-header-iframe');
            if (iframe) {
              iframe.contentWindow.postMessage({
                type: 'EXTENSION_AUTH',
                sessionToken: newToken,
                cookies: newCookies
              }, '*');

              setTimeout(() => {
                iframe.contentWindow.postMessage({
                  type: 'REFRESH_AUTH'
                }, '*');
              }, 500);
            }
          }
        }
      } else if (newAuthStatus === false) {
        console.log('[Content Script] ❌ User logged out');

        cachedAuthData = {
          sessionToken: null,
          cookies: [],
          isAuthenticated: false
        };
        authDataReady = true;

        // Remove header
        document.getElementById('nobstacle-header-container')?.remove();
        document.body.classList.remove('nobstacle-active');
        headerInjected = false;

        // Show login prompt
        if (!document.getElementById('nobstacle-login-prompt')) {
          showLoginPrompt();
        }
      }
    }
  }
});

async function loadStationFromBackground() {
  return new Promise((resolve) => {
    console.log('[Content Script] 🔍 Loading station from background...');

    // First try chrome storage
    chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[Content Script] ❌ Storage error:', chrome.runtime.lastError);
        selectedStation = "1";
        resolve("1");
        return;
      }

      if (result[STATION_STORAGE_KEY]) {
        const station = String(result[STATION_STORAGE_KEY]);
        console.log('[Content Script] ✅ Station from storage:', station);
        selectedStation = station;
        localStorage.setItem(STATION_STORAGE_KEY, station);
        stationLoadedFromStorage = true;
        resolve(station);
      } else {
        // Fallback to background message
        chrome.runtime.sendMessage({ action: 'getStation' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Content Script] ❌ Background error:', chrome.runtime.lastError);
            selectedStation = "1";
            resolve("1");
            return;
          }

          const station = (response && response.station) ? String(response.station) : "1";
          console.log('[Content Script] ✅ Station from background:', station);
          selectedStation = station;
          localStorage.setItem(STATION_STORAGE_KEY, station);
          stationLoadedFromStorage = true;
          resolve(station);
        });
      }
    });
  });
}

async function loadSavedStation() {
  return new Promise((resolve) => {
    console.log('[Content Script] 🔍 Loading station...');

    chrome.runtime.sendMessage({ action: 'getStation' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Content Script] ❌ Error:', chrome.runtime.lastError);
        selectedStation = "1";
        resolve("1");
        return;
      }

      selectedStation = (response && response.station) ? response.station : "1";
      console.log('[Content Script] ✅ Loaded station:', selectedStation);

      localStorage.setItem(STATION_STORAGE_KEY, selectedStation);
      resolve(selectedStation);
    });
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STATION_STORAGE_KEY]) {
    const newStation = changes[STATION_STORAGE_KEY].newValue;
    console.log('[Content Script] 📡 Station changed in storage:', newStation);

    selectedStation = String(newStation);
    localStorage.setItem(STATION_STORAGE_KEY, newStation);

    const iframe = document.getElementById('nobstacle-header-iframe');
    if (iframe && iframe.src.includes('station=')) {
      const newUrl = iframe.src.replace(/station=[^&]*/, `station=${newStation}`);
      console.log('[Content Script] 🔄 Reloading iframe with new station');
      iframe.src = newUrl;
    }
  }
});

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4'
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'audio/webm';
}

// ⭐ NEW: Aggressively check auth when content script loads
(async function initContentScript() {
  console.log('[Content Script] 🚀 Initializing...');

  // Force background to check auth immediately
  try {
    const authResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'forceAuthCheck' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Content Script] Auth check error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });

    if (authResponse?.isAuthenticated) {
      console.log('[Content Script] ✅ Auth confirmed on init');
      cachedAuthData = authResponse;
      authDataReady = true;
    } else {
      console.log('[Content Script] ⚠️ No auth on init');
    }
  } catch (error) {
    console.error('[Content Script] Error checking auth:', error);
  }

  // Continue with normal initialization
  chrome.storage.local.get(['extensionEnabled'], async (result) => {
    isEnabled = result.extensionEnabled !== false;

    if (isEnabled && shouldInject()) {
      console.log('[Content Script] 🚀 Extension enabled, initializing...');
      selectedStation = await loadStationFromBackground();
      console.log('[Content Script] ✅ Station ready for injection:', selectedStation);
      await new Promise(resolve => setTimeout(resolve, 100));
      await injectHeader();
    }
  });
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'stationChanged') {
    const newStation = String(request.station);
    console.log('[Content Script] 📡 Station changed notification:', newStation);

    selectedStation = newStation;
    localStorage.setItem(STATION_STORAGE_KEY, newStation);

    const iframe = document.getElementById('nobstacle-header-iframe');
    if (iframe && iframe.src.includes('station=')) {
      const currentUrl = new URL(iframe.src);
      currentUrl.searchParams.set('station', newStation);
      console.log('[Content Script] 🔄 Reloading iframe with new station');
      iframe.src = currentUrl.toString();
    }

    const stationEvent = new CustomEvent('stationChanged', {
      detail: { station: newStation }
    });
    window.dispatchEvent(stationEvent);

    sendResponse({ success: true });
  }

  if (request.action === 'toggle') {
    isEnabled = !isEnabled;
    chrome.storage.local.set({ extensionEnabled: isEnabled });

    if (isEnabled && !headerInjected && shouldInject()) {
      injectHeader();
      sendResponse({ injected: true });
    } else if (!isEnabled && headerInjected) {
      document.getElementById('nobstacle-header-container')?.remove();
      document.body.classList.remove('nobstacle-active');
      headerInjected = false;
      sendResponse({ injected: false });
    }
    return true;
  }

  if (request.action === 'triggerUpsell') {
    const iframe = document.getElementById('nobstacle-header-iframe');
    if (iframe) {
      iframe.contentWindow.postMessage({
        type: 'SEND_UPSELL_PACKAGES',
        categoryId: selectedCategory
      }, '*');
    } else {
      console.error('[Content Script] ERROR: Header iframe not found!');
    }

    sendResponse({ success: true, category: selectedCategory });
    return true;
  }

  if (request.action === 'showCategories') {
    if (categoriesData.length === 0 && !categoriesFetched) {
      fetchCategories().then(categories => {
        if (categories.length > 0) {
          createCategoryDropdown(categories);
        }
      });
    } else if (categoriesData.length > 0) {
      createCategoryDropdown(categoriesData);
    }

    sendResponse({ success: true });
    return true;
  }

  return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'authStatusChanged') {
    console.log('[Content Script] 🔔 Auth status changed:', request.isAuthenticated);

    if (request.isAuthenticated && request.sessionToken) {
      console.log('[Content Script] ✅ User logged in - updating auth cache');

      loginWindowOpened = false; // Reset flag

      // Update cached auth data
      cachedAuthData = {
        sessionToken: request.sessionToken,
        cookies: request.cookies || [],
        isAuthenticated: true
      };
      authDataReady = true;

      // Remove login prompt
      const loginPrompt = document.getElementById('nobstacle-login-prompt');
      if (loginPrompt) {
        // Show success message briefly before removing
        loginPrompt.innerHTML = `
          <div style="margin-bottom: 20px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 style="margin: 0 0 10px 0; color: #10b981; font-size: 20px; font-weight: 600;">Login Successful!</h2>
          <p style="margin: 0; color: #666; font-size: 14px;">Loading extension...</p>
        `;

        setTimeout(() => {
          loginPrompt.remove();
        }, 1500);
      }

      // Remove loader
      document.getElementById('nobstacle-loader')?.remove();

      // Inject header if not already injected
      if (!headerInjected && shouldInject()) {
        console.log('[Content Script] 🚀 Injecting header after login');
        setTimeout(() => {
          injectHeader();
        }, 1500); // Wait for success message
      } else if (headerInjected) {
        // Header already exists, refresh it
        const iframe = document.getElementById('nobstacle-header-iframe');
        if (iframe) {
          iframe.contentWindow.postMessage({
            type: 'EXTENSION_AUTH',
            sessionToken: request.sessionToken,
            cookies: request.cookies || []
          }, '*');

          setTimeout(() => {
            iframe.contentWindow.postMessage({
              type: 'REFRESH_AUTH'
            }, '*');
          }, 500);
        }
      }
    } else {
      console.log('[Content Script] ❌ User logged out');

      cachedAuthData = {
        sessionToken: null,
        cookies: [],
        isAuthenticated: false
      };
      authDataReady = true;

      // Remove header
      document.getElementById('nobstacle-header-container')?.remove();
      document.body.classList.remove('nobstacle-active');
      headerInjected = false;

      // Show login prompt (only if not already showing)
      if (!document.getElementById('nobstacle-login-prompt')) {
        showLoginPrompt();
      }
    }

    sendResponse({ success: true });
    return true;
  }

  return false;
});

function isInputFocused() {
  const activeElement = document.activeElement;
  const inputs = ['input', 'textarea', 'select'];
  return inputs.includes(activeElement?.tagName?.toLowerCase()) ||
    activeElement?.isContentEditable;
}

function setupKeyboardListener() {
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !isInputFocused()) {
      e.preventDefault();

      const iframe = document.getElementById('nobstacle-header-iframe');
      if (iframe) {
        iframe.contentWindow.postMessage({
          type: 'SHOW_CATEGORIES'
        }, '*');
      } else {
        console.error('[Content Script] Header iframe not found!');
      }
    }
  });
}

function injectStyles() {
  if (document.getElementById('nobstacle-header-styles')) return;

  const style = document.createElement('style');
  style.id = 'nobstacle-header-styles';
  style.textContent = `
    /* Fixed header at top */
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
      margin: 0 !important;
      padding: 0 !important;
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
    
    /* Push ALL body content down */
    body.nobstacle-active {
      padding-top: ${HEADER_HEIGHT} !important;
      box-sizing: border-box !important;
    }
    
    /* Override common conflicting styles */
    body.nobstacle-active > *:not(#nobstacle-header-container):not(#nobstacle-loader):not(#nobstacle-login-prompt):not(#nobstacle-debug-panel):not(#nobstacle-category-dropdown):not(#nobstacle-hamburger-dropdown):not(#nobstacle-chat-popup):not(#nobstacle-recording-indicator):not(#nobstacle-search-dropdown) {
      position: relative !important;
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

function createCategoryDropdown(categories) {
  document.getElementById('nobstacle-category-dropdown')?.remove();

  const iframe = document.getElementById('nobstacle-header-iframe');
  if (!iframe) {
    console.error('[Content Script] Header iframe not found!');
    return;
  }

  const iframeRect = iframe.getBoundingClientRect();

  const dropdown = document.createElement('div');
  dropdown.id = 'nobstacle-category-dropdown';
  dropdown.style.cssText = `
    position: fixed !important;
    top: ${iframeRect.bottom + 8}px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    background: white !important;
    border-radius: 12px !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
    min-width: 320px !important;
    max-width: 500px !important;
    max-height: 400px !important;
    overflow-y: auto !important;
    z-index: 2147483647 !important;
    border: 1px solid #e5e7eb !important;
    animation: slideDown 0.2s ease-out !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  `;

  const sortedCategories = [...categories].sort((a, b) =>
    (a.priceLevel || 0) - (b.priceLevel || 0)
  );

  const categoriesHTML = sortedCategories.map(category => {
    const isSelected = selectedCategory === category.id;
    return `
    <div 
      class="category-item"
      data-category-id="${category.id}"
      style="
        padding: 16px 20px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: all 0.2s;
        background: ${isSelected ? '#e8eef7' : 'white'};
      "
    >
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="flex: 1;">
          <div style="
            font-weight: 600; 
            font-size: 15px; 
            color: ${isSelected ? '#3b5998' : '#1f2937'}; 
            margin-bottom: 4px;
          ">
            ${category.name}
          </div>
          ${category.priceLevel ? `
            <div style="font-size: 12px; color: #6b7280;">
              Level ${category.priceLevel}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  }).join('');

  dropdown.innerHTML = `
    <div style="padding: 16px 20px; border-bottom: 2px solid #3b5998; background: #f8fafc;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">
        Select Category for Upsell
      </h3>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
        ${selectedCategory
      ? 'Category selected. Click wallet icon to send packages.'
      : 'Choose a category to filter room upgrade packages'}
      </p>
    </div>
    <div style="max-height: 320px; overflow-y: auto;">
      ${categoriesHTML}
    </div>
    <div style="padding: 12px 20px; border-top: 1px solid #e5e7eb; background: #f8fafc; display: flex; gap: 8px;">
      <button 
        id="clear-category-btn"
        style="
          flex: 1;
          padding: 10px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        "
      >
        Clear Selection
      </button>
    </div>
  `;

  document.body.appendChild(dropdown);

  setTimeout(() => {
    const categoryItems = dropdown.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
      item.addEventListener('click', () => {
        const categoryId = parseInt(item.getAttribute('data-category-id'));
        selectedCategory = categoryId;

        const iframe = document.getElementById('nobstacle-header-iframe');
        if (iframe) {
          iframe.contentWindow.postMessage({
            type: 'CATEGORY_SELECT',
            categoryId: categoryId
          }, '*');

          addDebugLog(`✓ Category ${categoryId} sent to iframe`);
        }

        setTimeout(() => {
          dropdown.remove();
        }, 300);
      });

      item.addEventListener('mouseenter', () => {
        if (selectedCategory !== parseInt(item.getAttribute('data-category-id'))) {
          item.style.background = '#f3f4f6';
        }
      });
      item.addEventListener('mouseleave', () => {
        if (selectedCategory !== parseInt(item.getAttribute('data-category-id'))) {
          item.style.background = 'white';
        }
      });
    });

    const clearBtn = dropdown.querySelector('#clear-category-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        selectedCategory = null;

        const iframe = document.getElementById('nobstacle-header-iframe');
        if (iframe) {
          iframe.contentWindow.postMessage({
            type: 'CATEGORY_SELECTED',
            categoryId: null
          }, '*');
        }

        dropdown.remove();
      });
    }

    const sendBtn = dropdown.querySelector('#send-upsell-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const iframe = document.getElementById('nobstacle-header-iframe');
        if (iframe) {
          iframe.contentWindow.postMessage({
            type: 'SEND_UPSELL_PACKAGES',
            categoryId: selectedCategory
          }, '*');
        }

        dropdown.remove();
      });
    }

    const closeHandler = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    document.addEventListener('mousedown', closeHandler);

    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        dropdown.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }, 100);

  addDebugLog('✓ Category dropdown created');
}

async function fetchCategories() {
  if (categoriesFetched && categoriesData.length > 0) {
    return categoriesData;
  }

  try {
    const Url = Isproduction
      ? 'https://nobstacle.com'
      : 'http://localhost:3000';

    const response = await fetch(`${Url}/api/v1/uploads/get-all-categories?fetchAll=true&limit=100`, {
      headers: {
        Authorization: `Bearer ${cachedAuthData?.sessionToken}`,
        'Cache-Control': 'no-cache'
      },
    });

    if (response.ok) {
      const json = await response.json();
      categoriesData = json.data || json;
      categoriesFetched = true;
      return categoriesData;
    } else {
      console.error('[Content Script] Failed to fetch categories:', response.status);
      return [];
    }
  } catch (error) {
    console.error('[Content Script] Error fetching categories:', error);
    return [];
  }
}

async function startAudioRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioChunks = [];

    const mimeType = getSupportedMimeType();
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      await sendAudioToBackend(audioBlob);

      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;

    createRecordingIndicator({ text: 'Recording... Speak now' });
    updateMicButtonState(true);

    return true;
  } catch (error) {
    console.error('[Content Script] Microphone error:', error);

    if (error.name === 'NotAllowedError') {
      alert('Microphone permission denied. Please allow microphone access in your browser settings.');
    } else if (error.name === 'NotFoundError') {
      alert('No microphone found. Please connect a microphone and try again.');
    } else {
      alert('Failed to access microphone: ' + error.message);
    }

    return false;
  }
}

function stopAudioRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;

    document.getElementById('nobstacle-recording-indicator')?.remove();
    updateMicButtonState(false);

    return true;
  }
  return false;
}

async function sendAudioToBackend(audioBlob) {
  try {
    const iframe = document.getElementById('nobstacle-header-iframe');
    if (!iframe) {
      console.error('[Content Script] ERROR: Iframe not found');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result.split(',')[1];

      iframe.contentWindow.postMessage({
        type: 'PROCESS_AUDIO',
        audioData: base64Audio,
        mimeType: audioBlob.type
      }, '*');
    };
    reader.readAsDataURL(audioBlob);

  } catch (error) {
    console.error('[Content Script] Error sending audio:', error);
    alert('Failed to process audio. Please try again.');
  }
}

function updateMicButtonState(recording) {
  const popup = document.getElementById('nobstacle-chat-popup');
  if (popup) {
    const micButton = popup.querySelector('#chat-mic-button');
    if (micButton) {
      micButton.setAttribute('data-recording', recording ? 'true' : 'false');
      micButton.style.background = recording ? '#ef4444' : '#3b5998';

      micButton.innerHTML = recording ? `
        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: white;">
          <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
        </svg>
      ` : `
        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: white;">
          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
        </svg>
      `;
    }
  }
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
      action: 'getAuthData'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Content] Error getting auth:', chrome.runtime.lastError);
        resolve([]);
      } else {
        resolve(response?.cookies || []);
      }
    });
  });
}


function showLoginPrompt() {
  const existingPrompt = document.getElementById('nobstacle-login-prompt');
  if (existingPrompt) {
    console.log('[Content Script] Login prompt already exists');
    return;
  }

  const prompt = document.createElement('div');
  prompt.id = 'nobstacle-login-prompt';
  prompt.style.cssText = `
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    background: white !important;
    padding: 30px !important;
    border-radius: 12px !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
    z-index: 2147483647 !important;
    text-align: center !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  `;

  prompt.innerHTML = `
    <div style="margin-bottom: 20px;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b5998" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    </div>
    <h2 style="margin: 0 0 10px 0; color: #333; font-size: 20px; font-weight: 600;">Login Required</h2>
    <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.5;">
      To use this extension, you need to log in to Nobstacle.
    </p>
    <div style="
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      text-align: left;
    ">
      <div style="
        display: flex;
        align-items: flex-start;
        gap: 10px;
        color: #856404;
        font-size: 13px;
        line-height: 1.5;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <div>
          <strong>Important:</strong> After logging in, please enable this extension on <strong>nobstacle.com</strong> for it to work properly.
        </div>
      </div>
    </div>
    <button 
      id="nobstacle-login-btn"
      style="
        padding: 12px 32px;
        background: #3b5998;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        margin-right: 10px;
        transition: all 0.2s;
      "
      onmouseover="this.style.background='#2d4373'"
      onmouseout="this.style.background='#3b5998'"
    >
      Open Nobstacle Login
    </button>
    <button 
      id="nobstacle-close-prompt"
      style="
        padding: 12px 24px;
        background: #f0f0f0;
        color: #666;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
      "
      onmouseover="this.style.background='#e0e0e0'"
      onmouseout="this.style.background='#f0f0f0'"
    >
      Close
    </button>
  `;

  document.body.appendChild(prompt);

  document.getElementById('nobstacle-login-btn').addEventListener('click', () => {
    if (loginWindowOpened) {
      console.log('[Content Script] Login window already opened');
      return;
    }

    loginWindowOpened = true;
    console.log('[Content Script] 🔑 Opening Nobstacle login page...');

    // Open login page and get tab ID
    chrome.runtime.sendMessage({
      action: 'openTab',
      url: 'https://nobstacle.com/'
    }, (response) => {
      if (response?.tabId) {
        console.log('[Content Script] Login tab opened:', response.tabId);
      }
    });

    // Start monitoring for login
    chrome.runtime.sendMessage({
      action: 'startLoginMonitoring'
    });

    // Update prompt to waiting state
    prompt.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b5998;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        "></div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </div>
      <h2 style="margin: 0 0 10px 0; color: #333; font-size: 20px; font-weight: 600;">Waiting for Login...</h2>
      <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.5;">
        Log in to Nobstacle in the new tab.
      </p>
      <div style="
        background: #e3f2fd;
        border: 1px solid #2196f3;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 20px;
        text-align: left;
      ">
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #0d47a1;
          font-size: 13px;
          line-height: 1.5;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div>
            <strong>Next Step:</strong> After logging in, click the extension icon on <strong>nobstacle.com</strong> to activate it. Then it will work on all websites.
          </div>
        </div>
      </div>
      <p style="margin: 0 0 15px 0; color: #999; font-size: 12px;">
        This will automatically close once you're logged in and activate the extension.
      </p>
      <button 
        id="nobstacle-cancel-btn"
        style="
          padding: 10px 24px;
          background: #f0f0f0;
          color: #666;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        "
        onmouseover="this.style.background='#e0e0e0'"
        onmouseout="this.style.background='#f0f0f0'"
      >
        Cancel
      </button>
    `;

    document.getElementById('nobstacle-cancel-btn').addEventListener('click', () => {
      loginWindowOpened = false;
      chrome.runtime.sendMessage({ action: 'stopLoginMonitoring' });
      prompt.remove();
    });

    // IMPROVED: Poll for auth status while waiting
    let pollAttempts = 0;
    const maxPollAttempts = 60; // 60 seconds max

    const pollInterval = setInterval(async () => {
      pollAttempts++;
      console.log(`[Content Script] Polling for auth... (${pollAttempts}/${maxPollAttempts})`);

      // Check auth status
      chrome.runtime.sendMessage({ action: 'forceAuthCheck' }, (response) => {
        if (response?.isAuthenticated && response?.sessionToken) {
          console.log('[Content Script] ✅ Auth detected during polling!');
          clearInterval(pollInterval);
          loginWindowOpened = false;

          // Update cached auth
          cachedAuthData = response;
          authDataReady = true;

          // Show success
          prompt.innerHTML = `
            <div style="margin-bottom: 20px;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 style="margin: 0 0 10px 0; color: #10b981; font-size: 20px; font-weight: 600;">Login Successful!</h2>
            <p style="margin: 0; color: #666; font-size: 14px;">Loading extension...</p>
          `;

          setTimeout(() => {
            prompt.remove();
            // Inject header if not already injected
            if (!headerInjected && shouldInject()) {
              injectHeader();
            }
          }, 1500);
        }
      });

      // Stop after max attempts
      if (pollAttempts >= maxPollAttempts) {
        clearInterval(pollInterval);
        console.log('[Content Script] ⏱️ Polling timeout');

        prompt.innerHTML = `
          <div style="margin-bottom: 20px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 style="margin: 0 0 10px 0; color: #ef4444; font-size: 20px; font-weight: 600;">Login Timeout</h2>
          <p style="margin: 0 0 25px 0; color: #666; font-size: 14px; line-height: 1.5;">
            We couldn't detect your login. Please try again.<br/>
            <span style="font-size: 12px; color: #999;">Make sure you're logging in at nobstacle.com</span>
          </p>
          <button 
            id="retry-login-btn"
            style="
              padding: 12px 24px;
              background: #3b5998;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              margin-right: 10px;
            "
          >
            Try Again
          </button>
          <button 
            id="close-timeout-btn"
            style="
              padding: 12px 24px;
              background: #f0f0f0;
              color: #666;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
            "
          >
            Close
          </button>
        `;

        document.getElementById('retry-login-btn').addEventListener('click', () => {
          loginWindowOpened = false;
          prompt.remove();
          setTimeout(() => showLoginPrompt(), 100);
        });

        document.getElementById('close-timeout-btn').addEventListener('click', () => {
          loginWindowOpened = false;
          prompt.remove();
        });
      }
    }, 1000); // Poll every second
  });

  document.getElementById('nobstacle-close-prompt').addEventListener('click', () => {
    prompt.remove();
  });
}

async function prefetchAuthData() {
  return new Promise((resolve) => {
    console.log('[Content Script] 🔍 Prefetching auth data...');

    // Check if we have valid cached data (less than 10 seconds old)
    if (cachedAuthData && cachedAuthData.isAuthenticated && cachedAuthData.sessionToken) {
      const cacheAge = authDataReady ? 0 : Infinity;
      if (cacheAge < 10000) { // Reduced from 30s to 10s
        console.log('[Content Script] ✅ Using valid cached auth data');
        resolve(cachedAuthData);
        return;
      }
    }

    // Set timeout for safety
    const timeout = setTimeout(() => {
      console.error('[Content Script] ⏱️ Auth fetch timeout');
      resolve({
        sessionToken: null,
        cookies: [],
        isAuthenticated: false
      });
    }, 8000); // Increased from 15s to 8s for faster failure

    // Try chrome.storage FIRST (fastest)
    chrome.storage.local.get([
      'authSessionToken',
      'authCookies',
      'isAuthenticated',
      'authTimestamp'
    ], async (storageResult) => {
      if (chrome.runtime.lastError) {
        console.error('[Content Script] ❌ Storage error:', chrome.runtime.lastError);
        clearTimeout(timeout);
        resolve({ sessionToken: null, cookies: [], isAuthenticated: false });
        return;
      }

      console.log('[Content Script] 📦 Storage result:', {
        hasToken: !!storageResult.authSessionToken,
        isAuthenticated: storageResult.isAuthenticated,
        age: storageResult.authTimestamp
          ? Math.round((Date.now() - storageResult.authTimestamp) / 1000) + 's'
          : 'unknown'
      });

      // If storage has valid auth, use it
      if (storageResult.isAuthenticated && storageResult.authSessionToken) {
        cachedAuthData = {
          sessionToken: storageResult.authSessionToken,
          cookies: storageResult.authCookies || [],
          isAuthenticated: true
        };
        authDataReady = true;
        console.log('[Content Script] ✅ Auth loaded from storage');
        clearTimeout(timeout);
        resolve(cachedAuthData);
        return;
      }

      // Storage doesn't have auth - force background to fetch fresh cookies
      console.log('[Content Script] 📨 Forcing background to fetch cookies...');
      chrome.runtime.sendMessage({ action: 'forceAuthCheck' }, (response) => {
        clearTimeout(timeout);

        if (chrome.runtime.lastError) {
          console.error('[Content Script] ❌ Background error:', chrome.runtime.lastError);
          cachedAuthData = { sessionToken: null, cookies: [], isAuthenticated: false };
          authDataReady = true;
          resolve(cachedAuthData);
          return;
        }

        console.log('[Content Script] 📦 Background response:', {
          hasToken: !!response?.sessionToken,
          isAuthenticated: response?.isAuthenticated
        });

        cachedAuthData = {
          sessionToken: response?.sessionToken || null,
          cookies: response?.cookies || [],
          isAuthenticated: response?.isAuthenticated === true && !!response?.sessionToken
        };
        authDataReady = true;
        resolve(cachedAuthData);
      });
    });
  });
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
  console.log('[Content Script] 🎨 createHamburgerDropdown called');
  console.log('[Content Script] content:', content);

  // Remove existing dropdown
  const existing = document.getElementById('nobstacle-hamburger-dropdown');
  if (existing) {
    console.log('[Content Script] Removing existing dropdown');
    existing.remove();
  }

  const iframe = document.getElementById('nobstacle-header-iframe');
  if (!iframe) {
    console.error('[Content Script] ❌ ERROR: Header iframe not found!');
    return;
  }

  console.log('[Content Script] ✅ Iframe found, creating dropdown...');

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

  console.log('[Content Script] Dropdown position:', {
    top: `${iframeRect.bottom + 8}px`,
    right: '16px'
  });

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
        
        <div style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0; background: #f8fafc;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: #3b5998; display: flex; align-items: center; justify-content: center;">
                    <svg style="color: white; width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11px; color: #6b7280; font-weight: 500; margin-bottom: 2px; text-transform: uppercase;">Company</div>
                    <div style="font-size: 15px; font-weight: 600; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${content.companyName || 'Company Name'}</div>
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
        
        <div style="padding: 8px;">
            <button 
                id="hamburger-logout-btn"
                style="
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: #dc2626;
                    transition: background-color 0.2s;
                "
            >
                <div style="width: 36px; height: 36px; border-radius: 8px; background: #fee2e2; display: flex; align-items: center; justify-content: center;">
                    <svg style="width: 18px; height: 18px; color: #dc2626;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"></path>
                    </svg>
                </div>
                <span>Logout</span>
            </button>
        </div>
    `;

  document.body.appendChild(dropdown);
  console.log('[Content Script] ✅ Dropdown appended to DOM');

  // Setup event listeners after a short delay
  setTimeout(() => {
    console.log('[Content Script] Setting up event listeners...');

    const select = dropdown.querySelector('#extension-station-select');
    if (select) {
      console.log('[Content Script] ✅ Station select found');

      // In content.js, when select changes:
      select.addEventListener('change', (e) => {
        const newStation = e.target.value;
        console.log('[Content Script] 🔄 Station changed to:', newStation);

        selectedStation = newStation;
        localStorage.setItem(STATION_STORAGE_KEY, newStation);

        chrome.storage.local.set({ [STATION_STORAGE_KEY]: newStation }, () => {
          console.log('[Content Script] ✅ Saved to chrome.storage:', newStation);

          iframe.contentWindow.postMessage({
            type: 'STATION_CHANGE',
            station: newStation
          }, '*');

          dropdown.remove();
        });
      });

      // Prevent dropdown from closing when clicking select
      select.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });

      select.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    } else {
      console.error('[Content Script] ❌ Station select NOT found!');
    }

    // Logout button
    const logoutBtn = dropdown.querySelector('#hamburger-logout-btn');
    if (logoutBtn) {
      console.log('[Content Script] ✅ Logout button found');

      logoutBtn.addEventListener('click', () => {
        console.log('[Content Script] Logout clicked');
        iframe.contentWindow.postMessage({ type: 'LOGOUT' }, '*');
        dropdown.remove();
      });

      logoutBtn.addEventListener('mouseenter', () => {
        logoutBtn.style.backgroundColor = '#fee2e2';
      });

      logoutBtn.addEventListener('mouseleave', () => {
        logoutBtn.style.backgroundColor = 'transparent';
      });
    } else {
      console.error('[Content Script] ❌ Logout button NOT found!');
    }
  }, 100);

  // Close dropdown when clicking outside
  setTimeout(() => {
    const closeHandler = (e) => {
      const iframeElement = document.getElementById('nobstacle-header-iframe');

      if (dropdown.contains(e.target) || e.target === iframeElement) {
        return;
      }

      console.log('[Content Script] Closing dropdown (clicked outside)');
      dropdown.remove();
      iframe.contentWindow.postMessage({ type: 'HAMBURGER_CLOSED' }, '*');
      document.removeEventListener('mousedown', closeHandler);
    };
    document.addEventListener('mousedown', closeHandler);
  }, 200);

  console.log('[Content Script] ✓ Hamburger dropdown created successfully');
}

function createChatPopup(content) {
  document.getElementById('nobstacle-chat-popup')?.remove();

  const iframe = document.getElementById('nobstacle-header-iframe');
  if (!iframe) {
    console.error('[Content Script] ERROR: Header iframe not found!');
    return;
  }

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

  setTimeout(() => {
    const messageInput = popup.querySelector('#chat-message-input');
    const sendButton = popup.querySelector('#chat-send-button');
    const micButton = popup.querySelector('#chat-mic-button');
    const clearButton = popup.querySelector('#chat-clear-button');
    const closeButton = popup.querySelector('#chat-close-button');
    const endSessionButton = popup.querySelector('#chat-end-session-button');

    if (messageInput && sendButton) {
      const sendMessage = () => {
        const message = messageInput.value.trim();
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
    }

    if (micButton) {
      micButton.addEventListener('click', async () => {
        if (!isRecording) {
          await startAudioRecording();
        } else {
          stopAudioRecording();
        }
      });
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        iframe.contentWindow.postMessage({
          type: 'CHAT_CLEAR'
        }, '*');
      });
    }

    if (endSessionButton) {
      endSessionButton.addEventListener('click', () => {
        iframe.contentWindow.postMessage({
          type: 'CHAT_END_SESSION'
        }, '*');
        popup.remove();
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        popup.remove();
        iframe.contentWindow.postMessage({ type: 'CHAT_POPUP_CLOSED' }, '*');
      });
    }
  }, 100);

  setTimeout(() => {
    const closeHandler = (e) => {
      const iframeElement = document.getElementById('nobstacle-header-iframe');
      if (!popup.contains(e.target) && e.target !== iframeElement) {
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
    // Template items handlers
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

    // Category items handlers
    const categoryItems = dropdown.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const categoryId = parseInt(item.getAttribute('data-category-id'));

        iframe.contentWindow.postMessage({
          type: 'CATEGORY_SELECT',
          categoryId: categoryId
        }, '*');

        dropdown.remove();
        addDebugLog(`✓ Category ${categoryId} selected and sent to iframe`);
      });
    });

    // ADD THIS: Form action buttons handlers
    const formActionButtons = dropdown.querySelectorAll('.form-action-btn');
    formActionButtons.forEach(button => {
      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const formId = button.getAttribute('data-form-id');
        const action = button.getAttribute('data-action');

        console.log('[Content Script] 📋 Form button clicked:', { formId, action });

        if (action === 'send-blank') {
          iframe.contentWindow.postMessage({
            type: 'FORM_SEND_BLANK',
            formId: formId
          }, '*');
        } else if (action === 'prefill') {
          iframe.contentWindow.postMessage({
            type: 'FORM_PREFILL',
            formId: formId
          }, '*');
        }

        dropdown.remove();
        addDebugLog(`✓ Form action ${action} triggered for form ${formId}`);
      });

      // Add hover effects
      button.addEventListener('mouseenter', () => {
        button.style.opacity = '0.9';
        button.style.transform = 'translateY(-1px)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.opacity = '1';
        button.style.transform = 'translateY(0)';
      });
    });
  }, 100);

  // Close handler
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

function createFormPrefillModal(formData) {
  console.log('[Content Script] 📝 Creating form prefill modal:', formData);

  // Remove existing modal if any
  document.getElementById('nobstacle-form-prefill-modal')?.remove();

  const iframe = document.getElementById('nobstacle-header-iframe');
  if (!iframe) {
    console.error('[Content Script] ❌ Header iframe not found!');
    return;
  }

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'nobstacle-form-prefill-modal';
  modalOverlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: rgba(0, 0, 0, 0.5) !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    animation: fadeIn 0.2s ease-out !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  `;

  // Create modal content container
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white !important;
    border-radius: 12px !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
    width: 90% !important;
    max-width: 600px !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    animation: slideDown 0.3s ease-out !important;
  `;

  modalContent.innerHTML = `
    <div style="
      padding: 20px 24px;
      border-bottom: 2px solid #3b5998;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: space-between;
    ">
      <div>
        <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">
          Prefill Form: ${formData.form_name}
        </h3>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
          Fill in the details below to send a prefilled form
        </p>
      </div>
      <button 
        id="close-prefill-modal"
        style="
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s;
          font-size: 20px;
          line-height: 1;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >
        ✕
      </button>
    </div>
    
    <div id="modal-iframe-container" style="
      flex: 1;
      overflow: hidden;
      background: white;
    ">
      <div style="
        padding: 40px;
        text-align: center;
        color: #666;
      ">
        <div style="
          width: 40px;
          height: 40px;
          border: 3px solid rgba(59, 89, 152, 0.3);
          border-top-color: #3b5998;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        "></div>
        <p>Loading form...</p>
      </div>
    </div>
    
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Setup close button
  const closeBtn = modalContent.querySelector('#close-prefill-modal');
  if (closeBtn) {
    closeBtn.addEventListener('mouseenter', (e) => {
      e.target.style.backgroundColor = '#f3f4f6';
    });
    closeBtn.addEventListener('mouseleave', (e) => {
      e.target.style.backgroundColor = 'transparent';
    });
    closeBtn.addEventListener('click', () => {
      modalOverlay.remove();
      iframe.contentWindow.postMessage({
        type: 'FORM_PREFILL_MODAL_CLOSED'
      }, '*');
    });
  }

  // Close on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
      iframe.contentWindow.postMessage({
        type: 'FORM_PREFILL_MODAL_CLOSED'
      }, '*');
    }
  });

  // Notify iframe to load the form content
  setTimeout(() => {
    iframe.contentWindow.postMessage({
      type: 'LOAD_FORM_PREFILL_CONTENT',
      formData: formData
    }, '*');
  }, 100);

  addDebugLog('✓ Form prefill modal created');
}

async function injectHeader() {
  if (document.getElementById('nobstacle-header-container')) {
    console.log('[Content Script] ⚠️ Header already injected');
    return;
  }

  showLoader();

  try {
    console.log('[Content Script] 🚀 Starting header injection...');

    // IMPROVED: Try to get auth data with multiple attempts
    let authAttempts = 0;
    const maxAttempts = 5; // Increased from 3 to 5
    let authData = null;

    while (authAttempts < maxAttempts) {
      console.log(`[Content Script] 🔍 Auth attempt ${authAttempts + 1}/${maxAttempts}`);

      authData = await prefetchAuthData();

      if (authData?.isAuthenticated && authData?.sessionToken) {
        console.log('[Content Script] ✅ Auth verified on attempt', authAttempts + 1);
        break;
      }

      authAttempts++;
      console.log(`[Content Script] ⚠️ Auth not found, attempt ${authAttempts}/${maxAttempts}`);

      if (authAttempts < maxAttempts) {
        // Progressive delays: 500ms, 1000ms, 1500ms, 2000ms
        const delay = authAttempts * 500;
        console.log(`[Content Script] ⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Force refresh auth from background
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'refreshAuth' }, (response) => {
            console.log('[Content Script] 🔄 Forced auth refresh result:', {
              hasToken: !!response?.sessionToken,
              isAuthenticated: response?.isAuthenticated
            });
            resolve();
          });
        });

        // Also directly check storage
        const storageResult = await new Promise((resolve) => {
          chrome.storage.local.get([
            'authSessionToken',
            'authCookies',
            'isAuthenticated'
          ], (result) => {
            resolve(result);
          });
        });

        console.log('[Content Script] 📦 Storage check:', {
          hasToken: !!storageResult.authSessionToken,
          isAuthenticated: storageResult.isAuthenticated
        });

        // Update cached data if storage has it
        if (storageResult.isAuthenticated && storageResult.authSessionToken) {
          cachedAuthData = {
            sessionToken: storageResult.authSessionToken,
            cookies: storageResult.authCookies || [],
            isAuthenticated: true
          };
          authDataReady = true;
          console.log('[Content Script] ✅ Auth found in storage!');
          authData = cachedAuthData;
          break;
        }
      }
    }

    if (!authData?.sessionToken || !authData?.isAuthenticated) {
      console.log('[Content Script] ❌ No valid auth after', maxAttempts, 'attempts');
      hideLoader();

      // Don't show login prompt if we're already monitoring for login
      if (!loginWindowOpened) {
        showLoginPrompt();
      }
      return;
    }

    headerInjected = true;
    injectStyles();

    const container = document.createElement('div');
    container.id = 'nobstacle-header-container';

    const iframe = document.createElement('iframe');
    iframe.id = 'nobstacle-header-iframe';

    const stationParam = selectedStation || "1";
    const iframeUrl = `${HEADER_URL}?station=${stationParam}`;

    iframe.src = iframeUrl;
    iframe.allow = 'clipboard-write; microphone *;';

    container.appendChild(iframe);
    document.body.appendChild(container);
    document.body.classList.add('nobstacle-active');

    injectDebugPanel();
    setupKeyboardListener();

    iframe.onload = async () => {
      console.log('[Content Script] 🎉 Iframe loaded!');

      chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
        const freshStation = result[STATION_STORAGE_KEY]
          ? String(result[STATION_STORAGE_KEY])
          : (selectedStation || "1");

        if (cachedAuthData && authDataReady && cachedAuthData.isAuthenticated) {
          // Send auth to iframe
          iframe.contentWindow.postMessage({
            type: 'EXTENSION_AUTH',
            sessionToken: cachedAuthData.sessionToken,
            cookies: cachedAuthData.cookies
          }, '*');

          // Send station
          iframe.contentWindow.postMessage({
            type: 'INITIAL_STATION',
            station: freshStation
          }, '*');

          console.log('[Content Script] ✅ Auth and station sent to iframe');

          updateDebugAuth(
            !!cachedAuthData.sessionToken,
            cachedAuthData.cookies.length,
            cachedAuthData.sessionToken || ''
          );
        } else {
          console.error('[Content Script] ❌ Auth data not ready or invalid');
        }
      });

      setTimeout(() => {
        hideLoader();
        console.log('[Content Script] ✅ Header fully loaded');
      }, 500);

      setTimeout(async () => {
        const freshAuth = await prefetchAuthData();
        if (freshAuth.isAuthenticated) {
          iframe.contentWindow.postMessage({
            type: 'EXTENSION_AUTH',
            sessionToken: freshAuth.sessionToken,
            cookies: freshAuth.cookies
          }, '*');
          console.log('[Content Script] ✅ Fresh auth sent');
        }
      }, 1000);
    };

    // ALL MESSAGE EVENT HANDLERS
    const handler = async (event) => {
      if (!ALLOWED_IFRAME_ORIGINS.includes(event.origin)) {
        return;
      }

      // REQUEST_AUTH
      if (event.data.type === 'REQUEST_AUTH') {
        console.log('[Content Script] 📨 Iframe requested auth');

        let authData = cachedAuthData;

        // If no cached auth, fetch fresh
        if (!authData || !authData.isAuthenticated) {
          authData = await prefetchAuthData();
        }

        if (authData.isAuthenticated) {
          iframe.contentWindow.postMessage({
            type: 'EXTENSION_AUTH',
            sessionToken: authData.sessionToken,
            cookies: authData.cookies
          }, '*');
          console.log('[Content Script] ✅ Auth sent to iframe');
        } else {
          console.error('[Content Script] ❌ Cannot provide auth - user not logged in');

          // If not authenticated, try one more time after delay
          setTimeout(async () => {
            const retryAuth = await prefetchAuthData();
            if (retryAuth.isAuthenticated) {
              iframe.contentWindow.postMessage({
                type: 'EXTENSION_AUTH',
                sessionToken: retryAuth.sessionToken,
                cookies: retryAuth.cookies
              }, '*');
              console.log('[Content Script] ✅ Auth sent after retry');
            } else {
              // Still no auth - show login
              hideLoader();
              if (!loginWindowOpened) {
                showLoginPrompt();
              }
            }
          }, 1000);
        }
      }

      // TEMPLATE_SHORTCUT_CLICK
      if (event.data.type === 'TEMPLATE_SHORTCUT_CLICK') {
        addDebugLog('Template shortcut clicked, forwarding to iframe');
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

      if (event.data.type === 'REQUEST_MICROPHONE_PERMISSION') {
        console.log('[Content Script] 🎤 Iframe requested microphone permission');

        // Content script CAN request microphone (iframe cannot)
        navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
            channelCount: 2
          }
        })
          .then(stream => {
            console.log('[Content Script] ✅ Microphone permission granted');

            // Send success back to iframe
            iframe.contentWindow.postMessage({
              type: 'MICROPHONE_PERMISSION_GRANTED',
              success: true
            }, '*');

            // Store stream for later use
            window.nobstacleAudioStream = stream;
          })
          .catch(error => {
            console.error('[Content Script] ❌ Microphone permission denied:', error);

            // Send error back to iframe
            iframe.contentWindow.postMessage({
              type: 'MICROPHONE_PERMISSION_DENIED',
              error: error.name,
              message: error.message
            }, '*');
          });
      }

      if (event.data.type === 'START_RECORDING') {
        console.log('[Content Script] 🔴 Starting recording...');

        if (!window.nobstacleAudioStream) {
          // Request permission first
          iframe.contentWindow.postMessage({
            type: 'RECORDING_ERROR',
            error: 'No microphone permission'
          }, '*');
          return;
        }

        const mimeType = getSupportedMimeType();
        const mediaRecorder = new MediaRecorder(window.nobstacleAudioStream, {
          mimeType: mimeType,
          audioBitsPerSecond: 128000
        });

        const audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('[Content Script] ⏹️ Recording stopped');

          const audioBlob = new Blob(audioChunks, { type: mimeType });

          // Convert to base64 to send to iframe
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result.split(',')[1];

            iframe.contentWindow.postMessage({
              type: 'RECORDING_COMPLETE',
              audioData: base64Audio,
              mimeType: mimeType
            }, '*');
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start(100);
        window.nobstacleMediaRecorder = mediaRecorder;

        // Notify iframe recording started
        iframe.contentWindow.postMessage({
          type: 'RECORDING_STARTED'
        }, '*');
      }

      // Handle stop recording
      if (event.data.type === 'STOP_RECORDING') {
        console.log('[Content Script] ⏹️ Stopping recording...');

        if (window.nobstacleMediaRecorder && window.nobstacleMediaRecorder.state !== 'inactive') {
          window.nobstacleMediaRecorder.stop();
        }
      }

      // RECORDING_INDICATOR
      if (event.data.type === 'RECORDING_INDICATOR') {
        if (event.data.show) {
          createRecordingIndicator(event.data);
        } else {
          document.getElementById('nobstacle-recording-indicator')?.remove();
        }
      }

      // HAMBURGER_MENU
      if (event.data.type === 'HAMBURGER_MENU') {
        if (event.data.isOpen) {
          console.log('[Content Script] Creating hamburger dropdown...');
          createHamburgerDropdown(event.data.content);
        } else {
          console.log('[Content Script] Closing hamburger dropdown...');
          document.getElementById('nobstacle-hamburger-dropdown')?.remove();
        }
      }

      // CHAT_POPUP
      if (event.data.type === 'CHAT_POPUP') {
        addDebugLog('Chat popup message received');
        if (event.data.isOpen) {
          createChatPopup(event.data.content);
        } else {
          document.getElementById('nobstacle-chat-popup')?.remove();
        }
      }

      // CHAT_UPDATE_MESSAGES
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

      // CHAT_SEND_MESSAGE
      if (event.data.type === 'CHAT_SEND_MESSAGE') {
        iframe.contentWindow.postMessage({
          type: 'CHAT_SEND_MESSAGE',
          message: event.data.message
        }, '*');
      }

      // CHAT_CLEAR
      if (event.data.type === 'CHAT_CLEAR') {
        iframe.contentWindow.postMessage({
          type: 'CHAT_CLEAR'
        }, '*');
      }

      // CHAT_POPUP_CLOSED
      if (event.data.type === 'CHAT_POPUP_CLOSED') {
        document.getElementById('nobstacle-chat-popup')?.remove();
      }

      // SEARCH_DROPDOWN
      if (event.data.type === 'SEARCH_DROPDOWN') {
        if (event.data.isOpen) {
          createSearchDropdown(event.data.content);
        } else {
          document.getElementById('nobstacle-search-dropdown')?.remove();
        }
      }

      // STATION_PICKER_HTML
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

      // SAVE_STATION_TO_STORAGE (new handler)
      if (event.data.type === 'SAVE_STATION_TO_STORAGE') {
        const newStation = String(event.data.station);
        console.log('[Content Script] 📥 SAVE_STATION_TO_STORAGE received:', newStation);

        // Update memory
        selectedStation = newStation;
        console.log('[Content Script] ✅ Updated memory:', selectedStation);

        // Save to localStorage (for quick access)
        localStorage.setItem(STATION_STORAGE_KEY, newStation);
        console.log('[Content Script] ✅ Saved to localStorage:', newStation);

        // CRITICAL: Save to chrome.storage
        chrome.storage.local.set(
          { [STATION_STORAGE_KEY]: newStation },
          () => {
            if (chrome.runtime.lastError) {
              console.error('[Content Script] ❌ Chrome storage error:', chrome.runtime.lastError);
            } else {
              console.log('[Content Script] ✅ Saved to chrome.storage:', newStation);

              // Verify the save
              chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
                const saved = String(result[STATION_STORAGE_KEY]);
                console.log('[Content Script] 🔍 Verification read:', saved);

                if (saved === newStation) {
                  console.log('[Content Script] ✅ Verification passed!');
                } else {
                  console.error('[Content Script] ❌ Verification failed!', {
                    expected: newStation,
                    actual: saved
                  });
                }
              });

              // Also notify background script
              chrome.runtime.sendMessage({
                action: 'setStation',
                station: newStation
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('[Content Script] ❌ Background error:', chrome.runtime.lastError);
                } else if (response && response.success) {
                  console.log('[Content Script] ✅ Background confirmed save');
                }
              });
            }
          }
        );

        // Reload iframe with new station
        const currentIframe = document.getElementById('nobstacle-header-iframe');
        if (currentIframe && currentIframe.src.includes('station=')) {
          const newUrl = currentIframe.src.replace(/station=[^&]*/, `station=${newStation}`);
          console.log('[Content Script] 🔄 Reloading iframe with new station');
          currentIframe.src = newUrl;
        }

        console.log('[Content Script] ✅ Station save complete');
      }

      // STATION_CHANGE
      if (event.data.type === 'STATION_CHANGE') {
        const newStation = String(event.data.station);
        console.log('[Content Script] 🔄 Station change requested:', newStation);

        // Update memory immediately
        selectedStation = newStation;
        console.log('[Content Script] ✅ Updated memory:', selectedStation);

        // Save to localStorage (for quick iframe access)
        localStorage.setItem(STATION_STORAGE_KEY, newStation);
        console.log('[Content Script] ✅ Saved to localStorage:', newStation);

        // CRITICAL: Save to chrome.storage
        chrome.storage.local.set(
          { [STATION_STORAGE_KEY]: newStation },
          () => {
            if (chrome.runtime.lastError) {
              console.error('[Content Script] ❌ Chrome storage error:', chrome.runtime.lastError);
            } else {
              console.log('[Content Script] ✅ Saved to chrome.storage:', newStation);

              // Verify the save
              chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
                const saved = String(result[STATION_STORAGE_KEY]);
                console.log('[Content Script] 🔍 Verification read:', saved);

                if (saved === newStation) {
                  console.log('[Content Script] ✅ Verification passed!');
                } else {
                  console.error('[Content Script] ❌ Verification failed!', {
                    expected: newStation,
                    actual: saved
                  });
                }
              });

              // ALSO notify background script (double-save for safety)
              chrome.runtime.sendMessage({
                action: 'setStation',
                station: newStation
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('[Content Script] ❌ Background message error:', chrome.runtime.lastError);
                } else if (response && response.success) {
                  console.log('[Content Script] ✅ Background confirmed station save');
                } else {
                  console.error('[Content Script] ❌ Background failed to save:', response);
                }
              });
            }
          }
        );

        // Reload iframe with new station
        const currentIframe = document.getElementById('nobstacle-header-iframe');
        if (currentIframe && currentIframe.src.includes('station=')) {
          const newUrl = currentIframe.src.replace(/station=[^&]*/, `station=${newStation}`);
          console.log('[Content Script] 🔄 Reloading iframe with new station');
          currentIframe.src = newUrl;
        }

        // Update page URL
        const url = new URL(window.location.href);
        url.searchParams.set('station', newStation);
        window.history.pushState({}, '', url.toString());
        console.log('[Content Script] ✅ Updated page URL');

        // Dispatch event for other listeners
        window.dispatchEvent(new CustomEvent('stationChanged', {
          detail: { station: newStation }
        }));
        console.log('[Content Script] ✅ Dispatched stationChanged event');

        console.log('[Content Script] ✅ Station change complete:', newStation);
      }

      // BACKEND_TOKEN
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

      // CHAT_RECORDING_STATE
      if (event.data.type === 'CHAT_RECORDING_STATE') {
        console.log('[Content Script] Recording state update:', event.data.isRecording);
        const popup = document.getElementById('nobstacle-chat-popup');
        if (popup) {
          const micButton = popup.querySelector('#chat-mic-button');
          if (micButton) {
            micButton.setAttribute('data-recording', event.data.isRecording ? 'true' : 'false');
            micButton.style.background = event.data.isRecording ? '#ef4444' : '#3b5998';

            micButton.innerHTML = event.data.isRecording ? `
              <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: white;">
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
              </svg>
            ` : `
              <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: white;">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
            `;
          }
        }
      }

      // CHAT_RECORDING_RESULT
      if (event.data.type === 'CHAT_RECORDING_RESULT') {
        console.log('[Content Script] Recording result received:', event.data.text);
        const popup = document.getElementById('nobstacle-chat-popup');
        if (popup) {
          const messageInput = popup.querySelector('#chat-message-input');
          if (messageInput) {
            messageInput.value = event.data.text;
            console.log('[Content Script] ✓ Transcribed text inserted into input');
          }
        }
      }

      // PROCESS_AUDIO
      if (event.data.type === 'PROCESS_AUDIO') {
        console.log('[Content Script] Audio processing requested');
      }

      // AUDIO_TRANSCRIPTION
      if (event.data.type === 'AUDIO_TRANSCRIPTION') {
        console.log('[Content Script] Received transcription:', event.data.text);

        const popup = document.getElementById('nobstacle-chat-popup');
        if (popup) {
          const messageInput = popup.querySelector('#chat-message-input');
          if (messageInput && event.data.text) {
            messageInput.value = event.data.text;
            console.log('[Content Script] ✓ Transcription inserted into input');

            if (iframe) {
              iframe.contentWindow.postMessage({
                type: 'CHAT_SEND_MESSAGE',
                message: event.data.text
              }, '*');

              messageInput.value = '';
              console.log('[Content Script] ✓ Message automatically sent');
            }
          }
        }
      }

      // TRIGGER_UPSELL
      if (event.data.type === 'TRIGGER_UPSELL') {
        if (iframe) {
          iframe.contentWindow.postMessage({
            type: 'SEND_UPSELL_PACKAGES',
            categoryId: selectedCategory
          }, '*');
        }
      }

      // CATEGORIES_DATA
      if (event.data.type === 'CATEGORIES_DATA') {
        categoriesData = event.data.categories;
        categoriesFetched = true;
      }

      // CATEGORY_SELECT
      if (event.data.type === 'CATEGORY_SELECT') {
        const categoryId = event.data.categoryId;
        selectedCategory = categoryId;

        if (iframe) {
          iframe.contentWindow.postMessage({
            type: 'CATEGORY_SELECT',
            categoryId: categoryId
          }, '*');
        }

        addDebugLog(`Category ${categoryId} selected`);
      }

      if (event.data.type === 'REQUEST_MICROPHONE_AND_START_RECORDING') {
        console.log('[Content Script] 🎤 Requesting microphone and starting recording...');

        navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
            channelCount: 2
          }
        })
          .then(stream => {
            console.log('[Content Script] ✅ Microphone permission granted');
            window.nobstacleAudioStream = stream;

            iframe.contentWindow.postMessage({
              type: 'MICROPHONE_PERMISSION_GRANTED',
              success: true
            }, '*');

            // Immediately start recording
            const mimeType = getSupportedMimeType();
            const mediaRecorder = new MediaRecorder(stream, {
              mimeType: mimeType,
              audioBitsPerSecond: 128000
            });

            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
              if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
              }
            };

            mediaRecorder.onstop = async () => {
              console.log('[Content Script] ⏹️ Recording stopped');

              const audioBlob = new Blob(audioChunks, { type: mimeType });

              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Audio = reader.result.split(',')[1];

                iframe.contentWindow.postMessage({
                  type: 'RECORDING_COMPLETE',
                  audioData: base64Audio,
                  mimeType: mimeType
                }, '*');

                // IMPORTANT: Stop and release microphone stream
                stream.getTracks().forEach(track => {
                  track.stop();
                  console.log('[Content Script] 🔇 Microphone track stopped');
                });
                window.nobstacleAudioStream = null;
              };
              reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.start(100);
            window.nobstacleMediaRecorder = mediaRecorder;

            iframe.contentWindow.postMessage({
              type: 'RECORDING_STARTED'
            }, '*');
          })
          .catch(error => {
            console.error('[Content Script] ❌ Microphone permission denied:', error);

            iframe.contentWindow.postMessage({
              type: 'MICROPHONE_PERMISSION_DENIED',
              error: error.name,
              message: error.message
            }, '*');
          });
      }

      // Handle microphone release request
      if (event.data.type === 'RELEASE_MICROPHONE') {
        console.log('[Content Script] 🔇 Releasing microphone...');

        if (window.nobstacleAudioStream) {
          window.nobstacleAudioStream.getTracks().forEach(track => {
            track.stop();
            console.log('[Content Script] ✅ Microphone track stopped');
          });
          window.nobstacleAudioStream = null;
        }

        if (window.nobstacleMediaRecorder) {
          window.nobstacleMediaRecorder = null;
        }
      }

      // Handle form prefill modal request
      if (event.data.type === 'OPEN_FORM_PREFILL_MODAL') {
        console.log('[Content Script] 📝 Opening form prefill modal');
        createFormPrefillModal(event.data.formData);
      }

      // Handle modal content update from iframe
      if (event.data.type === 'UPDATE_FORM_PREFILL_MODAL_CONTENT') {
        const modalContainer = document.getElementById('modal-iframe-container');
        if (modalContainer) {
          modalContainer.innerHTML = event.data.html;
          addDebugLog('✓ Form modal content updated');

          // IMPORTANT: Attach event listeners AFTER HTML is inserted
          setTimeout(() => {
            console.log('[Content Script] 🔧 Attaching button handlers...');

            const sendBtn = document.getElementById('send-prefill-btn');
            const cancelBtn = document.getElementById('cancel-prefill-btn');
            const form = document.getElementById('prefill-form');

            console.log('[Content Script] Elements found:', {
              sendBtn: !!sendBtn,
              cancelBtn: !!cancelBtn,
              form: !!form
            });

            if (sendBtn) {
              sendBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                console.log('[Content Script] 📤 Send button clicked!');

                // Collect form data
                const formData = {};
                const inputs = form.querySelectorAll('.form-input');

                console.log('[Content Script] Found', inputs.length, 'inputs');

                inputs.forEach(input => {
                  if (input.value) {
                    formData[input.name] = input.value;
                    console.log('[Content Script] Field:', input.name, '=', input.value);
                  }
                });

                console.log('[Content Script] Collected form data:', formData);

                const formId = this.getAttribute('data-form-id');
                console.log('[Content Script] Form ID:', formId);

                // Send to iframe
                const iframe = document.getElementById('nobstacle-header-iframe');
                if (iframe) {
                  console.log('[Content Script] Sending to iframe...');
                  iframe.contentWindow.postMessage({
                    type: 'PROCESS_PREFILL_FORM_SUBMISSION',
                    formId: formId,
                    formData: formData
                  }, '*');
                } else {
                  console.error('[Content Script] ❌ Iframe not found!');
                }
              });

              // Hover effect
              sendBtn.addEventListener('mouseenter', function () {
                this.style.backgroundColor = '#2d4373';
              });
              sendBtn.addEventListener('mouseleave', function () {
                this.style.backgroundColor = '#3b5998';
              });

              console.log('[Content Script] ✅ Send button handler attached');
            } else {
              console.error('[Content Script] ❌ Send button not found!');
            }

            if (cancelBtn) {
              cancelBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                console.log('[Content Script] ❌ Cancel button clicked!');

                const modal = document.getElementById('nobstacle-form-prefill-modal');
                if (modal) {
                  modal.remove();
                }

                // Notify iframe
                const iframe = document.getElementById('nobstacle-header-iframe');
                if (iframe) {
                  iframe.contentWindow.postMessage({
                    type: 'FORM_PREFILL_MODAL_CLOSED'
                  }, '*');
                }
              });

              // Hover effect
              cancelBtn.addEventListener('mouseenter', function () {
                this.style.backgroundColor = '#e5e7eb';
              });
              cancelBtn.addEventListener('mouseleave', function () {
                this.style.backgroundColor = '#f3f4f6';
              });

              console.log('[Content Script] ✅ Cancel button handler attached');
            } else {
              console.error('[Content Script] ❌ Cancel button not found!');
            }
          }, 100);
        }
      }

      // Handle form submission
      // In content.js, update the SUBMIT_PREFILL_FORM handler
      if (event.data.type === 'SUBMIT_PREFILL_FORM') {
        const { formId, formData } = event.data;

        console.log('[Content Script] Processing prefill submission:', { formId, formData });

        // Get the form
        const form = assignedForms.find(f => f.form_id === formId);

        if (!form) {
          console.error('[Content Script] Form not found:', formId);
          alert('Form not found');
          return;
        }

        // Forward to iframe to handle the actual submission
        iframe.contentWindow.postMessage({
          type: 'PROCESS_PREFILL_FORM_SUBMISSION',
          formId: formId,
          formData: formData
        }, '*');

        // Close modal
        document.getElementById('nobstacle-form-prefill-modal')?.remove();
      }

      // Handle modal close request
      if (event.data.type === 'CLOSE_PREFILL_MODAL') {
        document.getElementById('nobstacle-form-prefill-modal')?.remove();

        iframe.contentWindow.postMessage({
          type: 'FORM_PREFILL_MODAL_CLOSED'
        }, '*');
      }
    };

    window.addEventListener('message', handler);
    addDebugLog('✓ Header injection complete');
  } catch (error) {
    console.error('[Content Script] Error injecting header:', error);
    hideLoader();
    document.body.classList.remove('nobstacle-active');
    showLoginPrompt();
  }
}