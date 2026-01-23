// Background service worker - FIXED VERSION WITH ONCLICK AUTH DETECTION
let backendAccessToken = null;
let tokenExpiry = null;
let currentStation = null;
let isWaitingForLogin = false;
let loginCheckInterval = null;

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
      currentStation = "1";
      await chrome.storage.local.set({ [STATION_STORAGE_KEY]: "1" });
      console.log('[Background] ✅ Set and saved default station: 1');
    }
  } catch (error) {
    console.error('[Background] ❌ Error initializing station:', error);
    currentStation = "1";
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
  
  // Wait a bit before checking auth to let cookies settle
  setTimeout(async () => {
    await fetchAndCacheAuth();
  }, 1000);
});

// Initialize on browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Browser started');
  await initStation();
  
  // Wait for browser to fully load cookies
  setTimeout(async () => {
    await fetchAuthFromNobstacle();
    await fetchAndCacheAuth();
  }, 2000);
});

// Initialize immediately when script loads
initStation();
restoreTokenFromStorage();

// Check auth immediately on script load (with delay for cookies)
setTimeout(async () => {
  await fetchAndCacheAuth();
}, 1500);

// ⭐ NEW: Listen for extension icon clicks (popup opens)
// This ensures auth is checked when user manually opens the extension
chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Background] 🖱️ Extension icon clicked - forcing auth check');
  
  // Force fresh auth check with multiple attempts
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    console.log(`[Background] 🔍 Auth check attempt ${attempts + 1}/${maxAttempts}`);
    
    const authData = await fetchAndCacheAuth();
    
    if (authData.isAuthenticated && authData.sessionToken) {
      console.log('[Background] ✅ Auth verified on click!');
      // Notify all tabs immediately
      notifyAllTabsAuthChanged(true, authData.sessionToken, authData.cookies);
      break;
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500 * attempts));
    }
  }
});

async function fetchAndCacheAuth() {
  try {
    console.log('[Background] 🔍 Fetching auth from nobstacle.com...');

    // Try to get cookies with multiple attempts
    let cookies = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      cookies = await chrome.cookies.getAll({
        domain: 'nobstacle.com'
      });

      const sessionCookie = cookies.find(c =>
        c.name === '__Secure-next-auth.session-token' ||
        c.name === 'next-auth.session-token'
      );

      if (sessionCookie) {
        console.log('[Background] ✅ Session cookie found on attempt', attempts + 1);
        break;
      }

      attempts++;
      if (attempts < maxAttempts) {
        console.log('[Background] ⏳ Cookie not found, retrying...', attempts);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

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

      // Notify all tabs immediately
      notifyAllTabsAuthChanged(true, sessionCookie.value, cookies);

      return {
        sessionToken: sessionCookie.value,
        cookies,
        isAuthenticated: true
      };
    } else {
      console.log('[Background] ⚠️ No session cookie found');

      await chrome.storage.local.set({
        isAuthenticated: false,
        authTimestamp: Date.now(),
        authSessionToken: null,
        authCookies: []
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

// Helper function to notify all tabs about auth changes
function notifyAllTabsAuthChanged(isAuthenticated, sessionToken = null, cookies = []) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'authStatusChanged',
          isAuthenticated: isAuthenticated,
          sessionToken: sessionToken,
          cookies: cookies || []
        }).catch(() => {
          // Tab might not have content script, ignore
        });
      }
    });
  });
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

function startLoginMonitoring() {
  if (isWaitingForLogin) {
    console.log('[Background] ⚠️ Already monitoring for login');
    return;
  }
  
  isWaitingForLogin = true;
  console.log('[Background] 👀 Started monitoring for login...');
  
  // Check every 1 second for new session cookie (more frequent)
  loginCheckInterval = setInterval(async () => {
    const authData = await fetchAndCacheAuth();
    
    if (authData.isAuthenticated && authData.sessionToken) {
      console.log('[Background] ✅ Login detected via polling!');
      
      // Notify all tabs
      notifyAllTabsAuthChanged(true, authData.sessionToken, authData.cookies);
      
      isWaitingForLogin = false;
      clearInterval(loginCheckInterval);
      loginCheckInterval = null;
    }
  }, 1000); // Check every second
  
  // Stop monitoring after 10 minutes (increased timeout)
  setTimeout(() => {
    if (loginCheckInterval) {
      clearInterval(loginCheckInterval);
      loginCheckInterval = null;
      isWaitingForLogin = false;
      console.log('[Background] ⏰ Login monitoring timeout');
    }
  }, 10 * 60 * 1000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] 📨 Received message:', request.action);

  // ⭐ NEW: Force auth check handler
  if (request.action === 'forceAuthCheck') {
    console.log('[Background] 🔄 Forcing auth check...');
    
    (async () => {
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        const authData = await fetchAndCacheAuth();
        
        if (authData.isAuthenticated && authData.sessionToken) {
          sendResponse(authData);
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempts));
        }
      }
      
      sendResponse({
        sessionToken: null,
        cookies: [],
        isAuthenticated: false
      });
    })();
    
    return true; // Keep channel open for async response
  }

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

  if (request.action === 'setStation') {
    const newStation = String(request.station);
    console.log('[Background] 📥 setStation request:', newStation);

    chrome.storage.local.set(
      { [STATION_STORAGE_KEY]: newStation },
      () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] ❌ Storage error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[Background] ✅ Station saved:', newStation);

          currentStation = newStation;

          chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
            const saved = String(result[STATION_STORAGE_KEY]);
            console.log('[Background] 🔍 Verification read:', saved);

            if (saved === newStation) {
              console.log('[Background] ✅ Verification passed');

              chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                  if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                      action: 'stationChanged',
                      station: newStation
                    }).catch(() => {});
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

    return true;
  }

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

      // Always try to get fresh auth if cache is expired or missing
      if (isExpired || !result.authSessionToken || result.isAuthenticated !== true) {
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
      } else {
        // Cache is valid, return it
        console.log('[Background] ✅ Returning cached auth data');
        sendResponse({
          sessionToken: result.authSessionToken,
          cookies: result.authCookies || [],
          isAuthenticated: true
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

  if (request.action === 'startLoginMonitoring') {
    console.log('[Background] 📨 Starting login monitoring');
    startLoginMonitoring();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'stopLoginMonitoring') {
    console.log('[Background] 📨 Stopping login monitoring');
    if (loginCheckInterval) {
      clearInterval(loginCheckInterval);
      loginCheckInterval = null;
    }
    isWaitingForLogin = false;
    sendResponse({ success: true });
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
  
  // IMPORTANT: Listen for auth changes in storage
  if (areaName === 'local' && changes.isAuthenticated) {
    console.log('[Background] 🔔 Auth status changed in storage:', changes.isAuthenticated.newValue);
    
    if (changes.isAuthenticated.newValue === true && changes.authSessionToken) {
      const newToken = changes.authSessionToken.newValue;
      const newCookies = changes.authCookies?.newValue || [];
      
      // Notify all tabs
      notifyAllTabsAuthChanged(true, newToken, newCookies);
    }
  }
});

// Periodically refresh auth (more frequently)
setInterval(async () => {
  console.log('[Background] ⏰ Periodic auth refresh...');
  await fetchAndCacheAuth();
}, 60 * 1000); // Every 1 minute instead of 2

chrome.cookies.onChanged.addListener(async (changeInfo) => {
  if (changeInfo.cookie.domain.includes('nobstacle.com')) {
    const isSessionCookie = changeInfo.cookie.name === '__Secure-next-auth.session-token' || 
                           changeInfo.cookie.name === 'next-auth.session-token';
    
    if (isSessionCookie) {
      if (changeInfo.removed) {
        console.log('[Background] 🔴 Session cookie removed - user logged out');
        
        await chrome.storage.local.set({
          authSessionToken: null,
          authCookies: [],
          isAuthenticated: false,
          authTimestamp: Date.now()
        });
        
        // Notify all tabs
        notifyAllTabsAuthChanged(false, null, []);
      } else {
        console.log('[Background] 🟢 Session cookie changed - user logged in!');
        
        // Wait for cookies to fully sync, then check multiple times
        setTimeout(async () => {
          const authData = await fetchAndCacheAuth();
          
          if (authData.isAuthenticated && authData.sessionToken) {
            console.log('[Background] ✅ Login confirmed! Broadcasting to all tabs...');
            notifyAllTabsAuthChanged(true, authData.sessionToken, authData.cookies);
            
            isWaitingForLogin = false;
            if (loginCheckInterval) {
              clearInterval(loginCheckInterval);
              loginCheckInterval = null;
            }
          } else {
            // Retry after another delay
            setTimeout(async () => {
              const retryAuthData = await fetchAndCacheAuth();
              if (retryAuthData.isAuthenticated) {
                notifyAllTabsAuthChanged(true, retryAuthData.sessionToken, retryAuthData.cookies);
              }
            }, 1000);
          }
        }, 1500);
      }
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('nobstacle.com')) {

    console.log('[Background] 🔍 Nobstacle page loaded, checking for login...');

    // Wait for cookies to settle, then check multiple times
    setTimeout(async () => {
      const authData = await fetchAndCacheAuth();

      if (authData.isAuthenticated && authData.sessionToken) {
        console.log('[Background] ✅ Login detected! Notifying content scripts...');
        notifyAllTabsAuthChanged(true, authData.sessionToken, authData.cookies);
      } else {
        // Retry after delay
        setTimeout(async () => {
          const retryAuthData = await fetchAndCacheAuth();
          if (retryAuthData.isAuthenticated) {
            notifyAllTabsAuthChanged(true, retryAuthData.sessionToken, retryAuthData.cookies);
          }
        }, 1500);
      }
    }, 1000);
  }
});

// Web request interceptors
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