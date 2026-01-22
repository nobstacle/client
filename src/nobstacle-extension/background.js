// Background service worker - FIXED VERSION
let backendAccessToken = null;
let tokenExpiry = null;
let currentStation = null;

// API base URL
const API_BASE_URL = 'https://nobstacle-production-d145.up.railway.app';
const STATION_STORAGE_KEY = 'nobstacle_selected_station';
const AUTH_CACHE_KEY = 'nobstacle_auth_cache';
const AUTH_CACHE_DURATION = 5 * 60 * 1000;

async function initStation() {
  try {
    const result = await chrome.storage.local.get([STATION_STORAGE_KEY]);
    if (result[STATION_STORAGE_KEY]) {
      currentStation = String(result[STATION_STORAGE_KEY]);
      console.log('[Background] ✅ Initial station loaded:', currentStation);
    } else {
      // No station saved, set default and save it
      currentStation = "1";
      await chrome.storage.local.set({ [STATION_STORAGE_KEY]: "1" });
      console.log('[Background] ✅ Set and saved default station: 1');
    }
  } catch (error) {
    console.error('[Background] ❌ Error initializing station:', error);
    currentStation = "1";
    // Try to save default even if there was an error
    try {
      await chrome.storage.local.set({ [STATION_STORAGE_KEY]: "1" });
    } catch (e) {
      console.error('[Background] ❌ Could not save default station:', e);
    }
  }
}

// Initialize on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed/updated');
  await initStation();
  await restoreTokenFromStorage();
  await fetchAndCacheAuth();
});

// Initialize on browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Browser started');
  await initStation();
  await fetchAuthFromNobstacle();
  await fetchAndCacheAuth();
});

// Initialize immediately when script loads
initStation();
restoreTokenFromStorage();

async function fetchAndCacheAuth() {
  try {
    console.log('[Background] 🔍 Fetching auth from nobstacle.com...');

    const cookies = await chrome.cookies.getAll({
      domain: 'nobstacle.com'
    });

    console.log('[Background] 📦 Found cookies:', cookies.length);

    const sessionCookie = cookies.find(c =>
      c.name === '__Secure-next-auth.session-token' ||
      c.name === 'next-auth.session-token'
    );

    if (sessionCookie) {
      const authData = {
        authSessionToken: sessionCookie.value,
        authCookies: cookies,
        authTimestamp: Date.now(),
        isAuthenticated: true
      };

      await chrome.storage.local.set(authData);

      console.log('[Background] ✅ Auth cached successfully');
      console.log('[Background] 🔑 Session token:', sessionCookie.value.substring(0, 20) + '...');

      return {
        sessionToken: sessionCookie.value,
        cookies,
        isAuthenticated: true
      };
    } else {
      console.log('[Background] ⚠️ No session cookie found');

      // Mark as not authenticated
      await chrome.storage.local.set({
        isAuthenticated: false,
        authTimestamp: Date.now()
      });

      return {
        sessionToken: null,
        cookies: [],
        isAuthenticated: false
      };
    }
  } catch (error) {
    console.error('[Background] ❌ Error fetching auth:', error);
    return {
      sessionToken: null,
      cookies: [],
      isAuthenticated: false
    };
  }
}

async function fetchAuthFromNobstacle() {
  return await fetchAndCacheAuth();
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] 📨 Received message:', request.action);

  if (request.action === 'getStation') {
    console.log('[Background] 📥 getStation request');

    chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
      const station = result[STATION_STORAGE_KEY] ? String(result[STATION_STORAGE_KEY]) : "1";
      console.log('[Background] 📤 Returning station:', station);

      currentStation = station;
      sendResponse({ success: true, station: station });
    });

    return true;
  }

  // SET STATION - FIX: Better error handling and verification
  if (request.action === 'setStation') {
    const newStation = String(request.station);
    console.log('[Background] 📥 setStation request:', newStation);

    // Save to chrome.storage
    chrome.storage.local.set(
      { [STATION_STORAGE_KEY]: newStation },
      () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] ❌ Storage error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[Background] ✅ Station saved:', newStation);

          // Update memory
          currentStation = newStation;

          // Verify by reading back
          chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
            const saved = String(result[STATION_STORAGE_KEY]);
            console.log('[Background] 🔍 Verification read:', saved);

            if (saved === newStation) {
              console.log('[Background] ✅ Verification passed');

              // Notify all tabs about the change
              chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                  if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                      action: 'stationChanged',
                      station: newStation
                    }).catch(() => {
                      // Tab might not have content script, ignore
                    });
                  }
                });
              });

              sendResponse({ success: true, station: newStation });
            } else {
              console.error('[Background] ❌ Verification failed!', {
                expected: newStation,
                actual: saved
              });
              sendResponse({ success: false, error: 'Verification failed' });
            }
          });
        }
      }
    );

    return true; // Keep channel open for async response
  }

  // Other handlers remain the same...
  if (request.type === 'HEADER_READY') {
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'toggle') {
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getAuthData') {
    console.log('[Background] 📥 getAuthData request');

    chrome.storage.local.get([
      'authSessionToken',
      'authCookies',
      'authTimestamp',
      'isAuthenticated'
    ], async (result) => {
      const now = Date.now();
      const isExpired = !result.authTimestamp || (now - result.authTimestamp > AUTH_CACHE_DURATION);

      console.log('[Background] 📊 Auth cache status:', {
        hasToken: !!result.authSessionToken,
        isExpired: isExpired,
        isAuthenticated: result.isAuthenticated,
        age: result.authTimestamp ? Math.round((now - result.authTimestamp) / 1000) + 's' : 'never'
      });

      // If cache is valid and we have auth data, return it
      if (!isExpired && result.authSessionToken && result.isAuthenticated !== false) {
        console.log('[Background] ✅ Returning cached auth data');
        sendResponse({
          sessionToken: result.authSessionToken,
          cookies: result.authCookies || [],
          isAuthenticated: true
        });
      } else {
        // Cache is expired or empty, fetch fresh data
        console.log('[Background] 🔄 Fetching fresh auth data...');
        const authData = await fetchAndCacheAuth();

        console.log('[Background] 📤 Returning fresh auth data:', {
          hasToken: !!authData.sessionToken,
          isAuthenticated: authData.isAuthenticated
        });

        sendResponse(authData || {
          sessionToken: null,
          cookies: [],
          isAuthenticated: false
        });
      }
    });

    return true;
  }

  if (request.action === 'refreshAuth') {
    console.log('[Background] 🔄 Force refresh auth requested');

    fetchAndCacheAuth().then(authData => {
      sendResponse(authData);
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

// Listen for storage changes and update memory
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STATION_STORAGE_KEY]) {
    const newStation = String(changes[STATION_STORAGE_KEY].newValue);
    console.log('[Background] 📡 Storage changed externally:', newStation);
    currentStation = newStation;
  }
});

// Periodically refresh auth
setInterval(async () => {
  console.log('[Background] ⏰ Periodic auth refresh...');
  await fetchAndCacheAuth();
}, 2 * 60 * 1000);

// FIXED: Listen for cookie changes and notify content scripts
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes('nobstacle.com')) {
    const isSessionCookie = changeInfo.cookie.name === '__Secure-next-auth.session-token' ||
      changeInfo.cookie.name === 'next-auth.session-token';

    if (isSessionCookie) {
      if (changeInfo.removed) {
        console.log('[Background] 🔴 Session cookie removed - user logged out');
        chrome.storage.local.set({
          isAuthenticated: false,
          authTimestamp: Date.now()
        });

        // Notify all content scripts
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'authStatusChanged',
              isAuthenticated: false
            }).catch(() => { });
          });
        });
      } else {
        console.log('[Background] 🟢 Session cookie changed - user logged in or session refreshed');
        fetchAndCacheAuth().then((authData) => {
          // Notify all content scripts about new auth
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              chrome.tabs.sendMessage(tab.id, {
                action: 'authStatusChanged',
                isAuthenticated: authData.isAuthenticated,
                sessionToken: authData.sessionToken
              }).catch(() => { });
            });
          });
        });
      }
    }
  }
});

// Web request interceptors remain the same...
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

// Token expiry check
setInterval(() => {
  if (tokenExpiry && tokenExpiry < Date.now()) {
    backendAccessToken = null;
    tokenExpiry = null;
    chrome.storage.local.remove(['backendToken', 'backendTokenExpiry']);
  }
}, 60000);