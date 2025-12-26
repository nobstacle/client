// Background service worker
let backendAccessToken = null;
let tokenExpiry = null;

// API base URL
const API_BASE_URL = 'https://nobstacle-production-d145.up.railway.app';

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Nobstacle Header extension installed');

  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
  } else if (details.reason === 'update') {
    console.log('Extension updated');
    restoreTokenFromStorage();
  }

  // Restore token on startup
  restoreTokenFromStorage();
});

async function fetchAuthFromNobstacle() {
  try {
    // Get cookies from nobstacle.com domain
    const cookies = await chrome.cookies.getAll({
      domain: 'nobstacle.com'
    });

    const sessionCookie = cookies.find(c =>
      c.name === '__Secure-next-auth.session-token' ||
      c.name === 'next-auth.session-token'
    );

    if (sessionCookie) {
      // Store in chrome.storage for cross-domain access
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

// Restore token from chrome.storage when service worker starts
async function restoreTokenFromStorage() {
  try {
    const result = await chrome.storage.local.get(['backendToken', 'backendTokenExpiry']);
    if (result.backendToken) {
      // Check if token is still valid
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

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'HEADER_READY') {
    console.log('Header loaded on tab:', sender.tab?.id);
    sendResponse({ success: true });
  }

  if (request.action === 'toggle') {
    console.log('Toggle requested for tab:', sender.tab?.id);
    sendResponse({ success: true });
  }

  if (request.action === 'getAuthData') {
    chrome.storage.local.get(['authSessionToken', 'authCookies', 'authTimestamp'], async (result) => {
      // Check if auth data exists and is recent (less than 5 minutes old)
      if (result.authSessionToken && result.authTimestamp &&
        (Date.now() - result.authTimestamp < 5 * 60 * 1000)) {
        sendResponse({
          sessionToken: result.authSessionToken,
          cookies: result.authCookies
        });
      } else {
        // Fetch fresh auth data from nobstacle.com
        const authData = await fetchAuthFromNobstacle();
        sendResponse(authData || { sessionToken: null, cookies: [] });
      }
    });
    return true;
  }

  // Handle cookie requests
  if (request.action === 'getCookies') {
    chrome.cookies.getAll({ domain: request.domain }, (cookies) => {
      sendResponse({ cookies: cookies });
    });
    return true;
  }

  // Store backend token from iframe
  if (request.action === 'setBackendToken') {
    backendAccessToken = request.token;
    tokenExpiry = request.expiresIn;

    console.log('[Background] Storing backend token...');
    console.log('[Background] Token preview:', request.token.substring(0, 40) + '...');
    console.log('[Background] Expires:', new Date(request.expiresIn).toLocaleString());

    // Persist to storage
    chrome.storage.local.set({
      backendToken: request.token,
      backendTokenExpiry: request.expiresIn
    }, () => {
      console.log('[Background] ✓ Backend token stored successfully');
      sendResponse({ success: true });
    });
    return true;
  }

  // Get backend token
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
  }

  // Clear backend token (logout)
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

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.nobstacle_selected_station) {
    const { oldValue, newValue } = changes.nobstacle_selected_station;
    console.log('[Background] Station changed in storage:', {
      from: oldValue,
      to: newValue
    });
  }
});

// Add a helper to check storage on demand
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStation') {
    chrome.storage.local.get(['nobstacle_selected_station'], (result) => {
      console.log('[Background] Current station in storage:', result.nobstacle_selected_station);
      sendResponse({ station: result.nobstacle_selected_station });
    });
    return true;
  }
  
  if (request.action === 'setStation') {
    const station = String(request.station);
    chrome.storage.local.set({
      nobstacle_selected_station: station
    }, () => {
      console.log('[Background] Station saved to storage:', station);
      sendResponse({ success: true });
    });
    return true;
  }
})

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Only modify requests to your API
    if (details.url.includes('nobstacle-production-d145.up.railway.app')) {
      // Check if token exists and is valid
      if (backendAccessToken && (!tokenExpiry || tokenExpiry > Date.now())) {
        const headers = details.requestHeaders || [];

        // Remove existing Authorization header if any
        const authIndex = headers.findIndex(h => h.name.toLowerCase() === 'authorization');
        if (authIndex !== -1) {
          headers.splice(authIndex, 1);
        }

        // Add the backend token
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

// Use onHeadersReceived instead of onCompleted for better performance
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

chrome.runtime.onStartup.addListener(() => {
  fetchAuthFromNobstacle();
});

chrome.runtime.onInstalled.addListener(() => {
  fetchAuthFromNobstacle();
  restoreTokenFromStorage();
});

// Periodically check token expiry
setInterval(() => {
  if (tokenExpiry && tokenExpiry < Date.now()) {
    console.log('[Background] Token expired (periodic check), clearing');
    backendAccessToken = null;
    tokenExpiry = null;
    chrome.storage.local.remove(['backendToken', 'backendTokenExpiry']);
  }
}, 60000); // Check every minute