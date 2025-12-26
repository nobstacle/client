
// Background service worker
let backendAccessToken = null;
let tokenExpiry = null;
let currentStation = null; // In-memory station state

// API base URL
const API_BASE_URL = 'https://nobstacle-production-d145.up.railway.app';
const STATION_STORAGE_KEY = 'nobstacle_selected_station';

chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
  currentStation = result[STATION_STORAGE_KEY] || "1";
  console.log('[Background] 🚀 Initial station:', currentStation);
});


// Initialize station on startup
async function initializeStation() {
  chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
    if (result[STATION_STORAGE_KEY]) {
      currentStation = String(result[STATION_STORAGE_KEY]);
      console.log('[Background] 🚀 Station initialized:', currentStation);
    } else {
      // Set default
      currentStation = "1";
      chrome.storage.local.set({ [STATION_STORAGE_KEY]: "1" });
      console.log('[Background] 🚀 Station set to default: 1');
    }
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Nobstacle Header extension installed');

  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
    initializeStation();
  } else if (details.reason === 'update') {
    console.log('Extension updated');
    restoreTokenFromStorage();
    initializeStation();
  }

  // Restore token on startup
  restoreTokenFromStorage();
});

chrome.runtime.onStartup.addListener(() => {
  fetchAuthFromNobstacle();
  initializeStation();
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
        console.log('[Background] Token expires:', new Date(tokenExpiry).toLocaleString());
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
// STATION MANAGEMENT MESSAGES
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // GET STATION - Returns current station
  if (request.action === 'getStation') {
    // If currentStation is still null, read from storage
    if (currentStation === null) {
      chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
        currentStation = result[STATION_STORAGE_KEY] || "1";
        console.log('[Background] 📍 Returning station:', currentStation);
        sendResponse({ success: true, station: currentStation });
      });
      return true; // Keep channel open for async response
    } else {
      console.log('[Background] 📍 Returning station:', currentStation);
      sendResponse({ success: true, station: currentStation });
    }
    return true;
  }

  // SET STATION - Saves new station
if (request.action === 'setStation') {
    const newStation = String(request.station);
    console.log('[Background] 💾 Saving station:', newStation);
    
    currentStation = newStation;
    
    chrome.storage.local.set({
      [STATION_STORAGE_KEY]: newStation
    }, () => {
      console.log('[Background] ✅ Station saved to storage');
      sendResponse({ success: true, station: newStation });
    });
    
    return true;
  }

  // Existing handlers...
  if (request.type === 'HEADER_READY') {
    console.log('Header loaded on tab:', sender.tab?.id);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'toggle') {
    console.log('Toggle requested for tab:', sender.tab?.id);
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

    console.log('[Background] Storing backend token...');
    console.log('[Background] Token preview:', request.token.substring(0, 40) + '...');
    console.log('[Background] Expires:', new Date(request.expiresIn).toLocaleString());

    chrome.storage.local.set({
      backendToken: request.token,
      backendTokenExpiry: request.expiresIn
    }, () => {
      console.log('[Background] ✓ Backend token stored successfully');
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getBackendToken') {
    if (tokenExpiry && tokenExpiry < Date.now()) {
      console.log('[Background] Token expired');
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
      console.log('[Background] Backend token cleared');
      sendResponse({ success: true });
    });
    return true;
  }

  return true;
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

        console.log('[Background] ✓ Added Authorization header to:', details.url);

        return { requestHeaders: headers };
      } else {
        console.log('[Background] ⚠ No valid token available for:', details.url);
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
      console.log('[Background] 401 detected, clearing token');
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
    console.log('[Background] Token expired (periodic check), clearing');
    backendAccessToken = null;
    tokenExpiry = null;
    chrome.storage.local.remove(['backendToken', 'backendTokenExpiry']);
  }
}, 60000);

