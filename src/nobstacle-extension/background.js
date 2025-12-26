// Background service worker
let backendAccessToken = null;
let tokenExpiry = null;
let currentStation = "1"; // Always initialize with default

// API base URL
const API_BASE_URL = 'https://nobstacle-production-d145.up.railway.app';
const STATION_STORAGE_KEY = 'nobstacle_selected_station';

console.log('[Background] 🚀 Background script starting...');

// Initialize station immediately
(async function initStation() {
  try {
    const result = await chrome.storage.local.get([STATION_STORAGE_KEY]);
    if (result[STATION_STORAGE_KEY]) {
      currentStation = String(result[STATION_STORAGE_KEY]);
      console.log('[Background] ✅ Initial station loaded:', currentStation);
    } else {
      // No station saved, set default
      await chrome.storage.local.set({ [STATION_STORAGE_KEY]: "1" });
      currentStation = "1";
      console.log('[Background] ✅ Set default station: 1');
    }
  } catch (error) {
    console.error('[Background] ❌ Error initializing station:', error);
    currentStation = "1";
  }
})();

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed/updated');
  
  // Ensure station is set
  const result = await chrome.storage.local.get([STATION_STORAGE_KEY]);
  if (!result[STATION_STORAGE_KEY]) {
    await chrome.storage.local.set({ [STATION_STORAGE_KEY]: "1" });
    currentStation = "1";
    console.log('[Background] Set default station on install');
  }
  
  await restoreTokenFromStorage();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Browser started');
  await fetchAuthFromNobstacle();
  
  // Reload station from storage
  const result = await chrome.storage.local.get([STATION_STORAGE_KEY]);
  if (result[STATION_STORAGE_KEY]) {
    currentStation = String(result[STATION_STORAGE_KEY]);
    console.log('[Background] Startup - station loaded:', currentStation);
  }
});

async function fetchAuthFromNobstacle() {
  try {
    const cookies = await chrome.cookies.getAll({
      domain: 'nobstacle.com'
    });

    const sessionCookie = cookies.find(c =>
      c.name === '__Secure-next-auth.session-token' ||
      c.name === 'next-auth.session-token'
    );

    if (sessionCookie) {
      await chrome.storage.local.set({
        authSessionToken: sessionCookie.value,
        authCookies: cookies,
        authTimestamp: Date.now()
      });

      console.log('[Background] ✓ Auth data stored from nobstacle.com');
      return { sessionToken: sessionCookie.value, cookies };
    }

    return null;
  } catch (error) {
    console.error('[Background] Error fetching auth:', error);
    return null;
  }
}

async function restoreTokenFromStorage() {
  try {
    const result = await chrome.storage.local.get(['backendToken', 'backendTokenExpiry']);
    if (result.backendToken) {
      if (result.backendTokenExpiry && result.backendTokenExpiry > Date.now()) {
        backendAccessToken = result.backendToken;
        tokenExpiry = result.backendTokenExpiry;
        console.log('[Background] ✓ Token restored from storage');
      } else {
        console.log('[Background] Stored token expired, clearing');
        await chrome.storage.local.remove(['backendToken', 'backendTokenExpiry']);
      }
    }
  } catch (error) {
    console.error('[Background] Error restoring token:', error);
  }
}

// ============================================
// MESSAGE HANDLERS
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] 📨 Received message:', request.action, request);
  
  // GET STATION
  if (request.action === 'getStation') {
    // Always get fresh value from storage
    chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
      const station = result[STATION_STORAGE_KEY] || "1";
      currentStation = String(station);
      console.log('[Background] 📍 GET STATION - Returning:', currentStation);
      sendResponse({ success: true, station: currentStation });
    });
    return true; // Keep channel open
  }

  // SET STATION
 // SET STATION
if (request.action === 'setStation') {
  const newStation = String(request.station);
  console.log('[Background] 💾 SET STATION - Saving:', newStation);
  
  // Update in-memory FIRST
  currentStation = newStation;
  
  // Save to storage - FIXED: Proper async handling
  chrome.storage.local.set(
    { [STATION_STORAGE_KEY]: newStation }
  ).then(() => {
    console.log('[Background] ✅ Station saved successfully:', newStation);
    
    // Verify save by reading back
    chrome.storage.local.get([STATION_STORAGE_KEY]).then((result) => {
      console.log('[Background] 🔍 Verification - Storage now has:', result[STATION_STORAGE_KEY]);
    });
    
    // Notify all content scripts
    chrome.tabs.query({}).then((tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'stationChanged', station: newStation }
          ).catch(() => {
            // Ignore errors for tabs without content script
          });
        }
      });
    });
    
    sendResponse({ success: true, station: newStation });
  }).catch((error) => {
    console.error('[Background] ❌ Error saving station:', error);
    sendResponse({ success: false, error: error.message });
  });
  
  return true; // Keep channel open for async response
}

  // Other handlers
  if (request.type === 'HEADER_READY') {
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'toggle') {
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getAuthData') {
    chrome.storage.local.get(['authSessionToken', 'authCookies', 'authTimestamp'], async (result) => {
      if (result.authSessionToken && result.authTimestamp &&
        (Date.now() - result.authTimestamp < 5 * 60 * 1000)) {
        sendResponse({
          sessionToken: result.authSessionToken,
          cookies: result.authCookies
        });
      } else {
        const authData = await fetchAuthFromNobstacle();
        sendResponse(authData || { sessionToken: null, cookies: [] });
      }
    });
    return true;
  }

  if (request.action === 'getCookies') {
    chrome.cookies.getAll({ domain: request.domain }, (cookies) => {
      sendResponse({ cookies: cookies });
    });
    return true;
  }

  if (request.action === 'setBackendToken') {
    backendAccessToken = request.token;
    tokenExpiry = request.expiresIn;

    chrome.storage.local.set({
      backendToken: request.token,
      backendTokenExpiry: request.expiresIn
    }, () => {
      console.log('[Background] ✓ Backend token stored');
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getBackendToken') {
    if (tokenExpiry && tokenExpiry < Date.now()) {
      backendAccessToken = null;
      tokenExpiry = null;
      chrome.storage.local.remove(['backendToken', 'backendTokenExpiry']);
      sendResponse({ token: null, expired: true });
    } else {
      sendResponse({ token: backendAccessToken, expired: false });
    }
    return true;
  }

  if (request.action === 'openTab') {
    chrome.tabs.create({ url: request.url });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'clearBackendToken') {
    backendAccessToken = null;
    tokenExpiry = null;
    chrome.storage.local.remove(['backendToken', 'backendTokenExpiry'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  return true;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STATION_STORAGE_KEY]) {
    const newStation = String(changes[STATION_STORAGE_KEY].newValue);
    console.log('[Background] 📡 Storage changed - updating currentStation to:', newStation);
    currentStation = newStation;
  }
});

setInterval(async () => {
  await fetchAuthFromNobstacle();
}, 2 * 60 * 1000);

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.url.includes('nobstacle-production-d145.up.railway.app')) {
      if (backendAccessToken && (!tokenExpiry || tokenExpiry > Date.now())) {
        const headers = details.requestHeaders || [];
        const authIndex = headers.findIndex(h => h.name.toLowerCase() === 'authorization');
        if (authIndex !== -1) {
          headers.splice(authIndex, 1);
        }
        headers.push({
          name: 'Authorization',
          value: `Bearer ${backendAccessToken}`
        });
        return { requestHeaders: headers };
      }
    }
    return {};
  },
  { urls: ["https://nobstacle-production-d145.up.railway.app/*"] },
  ["requestHeaders", "extraHeaders"]
);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.statusCode === 401 && details.url.includes('nobstacle-production-d145.up.railway.app')) {
      backendAccessToken = null;
      tokenExpiry = null;
      chrome.storage.local.remove(['backendToken', 'backendTokenExpiry']);
    }
  },
  { urls: ["https://nobstacle-production-d145.up.railway.app/*"] },
  ["responseHeaders"]
);

setInterval(() => {
  if (tokenExpiry && tokenExpiry < Date.now()) {
    backendAccessToken = null;
    tokenExpiry = null;
    chrome.storage.local.remove(['backendToken', 'backendTokenExpiry']);
  }
}, 60000);