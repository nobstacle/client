// Background service worker - IMPROVED LOGIN DETECTION
let backendAccessToken = null;
let tokenExpiry = null;
let currentStation = null;
let isWaitingForLogin = false;
let loginCheckInterval = null;
let loginTabId = null; // Track the login tab

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
  }
}

// IMPROVED: More aggressive auth fetching
async function fetchAuthViaNobstacleTab() {
  return new Promise(async (resolve) => {
    console.log('[Background] 🔍 Fetching auth via nobstacle.com tab...');

    try {
      // Try to find existing nobstacle.com tab
      const tabs = await chrome.tabs.query({ url: 'https://nobstacle.com/*' });

      if (tabs.length > 0) {
        console.log('[Background] ✅ Found existing nobstacle.com tab');
        const tab = tabs[0];

        // Ask the content script on nobstacle.com to fetch cookies
        chrome.tabs.sendMessage(tab.id, {
          action: 'fetchAuthCookies'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('[Background] ⚠️ Could not communicate with tab');
            // Try cookies API directly as fallback
            getCookiesDirectly().then(resolve);
          } else if (response?.cookies) {
            handleAuthCookiesReceived(response.cookies).then(() => {
              resolve(response);
            });
          } else {
            getCookiesDirectly().then(resolve);
          }
        });
      } else {
        console.log('[Background] ⚠️ No nobstacle.com tab found');
        // Try cookies API directly
        getCookiesDirectly().then(resolve);
      }
    } catch (error) {
      console.error('[Background] ❌ Error fetching auth:', error);
      getCookiesDirectly().then(resolve);
    }
  });
}

// NEW: Direct cookies API access (more reliable)
async function getCookiesDirectly() {
  try {
    console.log('[Background] 🍪 Fetching cookies directly...');

    // Check if we just logged out
    const logoutCheck = await chrome.storage.local.get(['justLoggedOut', 'justLoggedOutTime']);
    if (logoutCheck.justLoggedOut && logoutCheck.justLoggedOutTime) {
      const elapsed = Date.now() - logoutCheck.justLoggedOutTime;
      if (elapsed < 8000) {
        console.log(`[Background] 🕒 Ignoring getCookiesDirectly (cooldown active: ${elapsed}ms ago)`);
        return {
          sessionToken: null,
          cookies: [],
          isAuthenticated: false
        };
      } else {
        // Cooldown expired, clean it up
        await chrome.storage.local.remove(['justLoggedOut', 'justLoggedOutTime']);
      }
    }

    // Try multiple domain variations
    const domains = [
      'nobstacle.com',
      '.nobstacle.com',
      'www.nobstacle.com'
    ];

    let allCookies = [];

    for (const domain of domains) {
      const cookies = await chrome.cookies.getAll({ domain });
      console.log(`[Background]   Domain ${domain}: ${cookies.length} cookies`);
      allCookies.push(...cookies);
    }

    // Remove duplicates
    const uniqueCookies = Array.from(
      new Map(allCookies.map(c => [c.name, c])).values()
    );

    console.log('[Background] 📦 Total unique cookies:', uniqueCookies.length);

    // Log all cookie names
    uniqueCookies.forEach(c => {
      console.log(`[Background]   - ${c.name} (httpOnly: ${c.httpOnly}, secure: ${c.secure}, sameSite: ${c.sameSite})`);
    });

    const sessionCookie = uniqueCookies.find(c =>
      c.name === '__Secure-next-auth.session-token' ||
      c.name === 'next-auth.session-token'
    );

    if (sessionCookie) {
      console.log('[Background] ✅ Session cookie found:', sessionCookie.name);
      await handleAuthCookiesReceived(uniqueCookies);
      return {
        sessionToken: sessionCookie.value,
        cookies: uniqueCookies,
        isAuthenticated: true
      };
    } else {
      console.log('[Background] ⚠️ No session cookie found');

      // Check storage for session data from nobstacle.com tab
      const stored = await chrome.storage.local.get([
        'sessionData',
        'user',
        'isAuthenticated',
        'authTimestamp'
      ]);

      if (stored.isAuthenticated && stored.user) {
        console.log('[Background] ✅ Using stored session data from nobstacle.com');
        return {
          sessionToken: 'session-from-api',
          cookies: uniqueCookies,
          isAuthenticated: true,
          sessionData: stored.sessionData,
          user: stored.user
        };
      }

      await chrome.storage.local.set({
        isAuthenticated: false,
        authTimestamp: Date.now(),
        authSessionToken: null,
        authCookies: []
      });
      return null;
    }
  } catch (error) {
    console.error('[Background] ❌ Error getting cookies directly:', error);
    return null;
  }
}

// Handle cookies received
async function handleAuthCookiesReceived(cookies) {
  console.log('[Background] 📦 Processing cookies:', cookies.length);

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

    // CRITICAL: Notify ALL content scripts
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'authStatusChanged',
        isAuthenticated: true,
        sessionToken: sessionCookie.value,
        cookies: cookies
      }).catch(() => {
        // Ignore errors for tabs that don't have content script
      });
    });

    return true;
  } else {
    console.log('[Background] ⚠️ No session cookie found');
    await chrome.storage.local.set({
      isAuthenticated: false,
      authTimestamp: Date.now(),
      authSessionToken: null,
      authCookies: []
    });
    return false;
  }
}

async function clearSessionCookies() {
  try {
    console.log('[Background] 🧹 Removing session cookies from browser...');
    const domains = ['nobstacle.com', '.nobstacle.com', 'www.nobstacle.com', 'localhost', '127.0.0.1'];
    const cookieNames = ['__Secure-next-auth.session-token', 'next-auth.session-token'];
    
    for (const domain of domains) {
      const cookies = await chrome.cookies.getAll({ domain });
      for (const cookie of cookies) {
        if (cookieNames.includes(cookie.name)) {
          const prefix = cookie.secure ? 'https://' : 'http://';
          const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
          const url = `${prefix}${cookieDomain}${cookie.path}`;
          
          await chrome.cookies.remove({
            url: url,
            name: cookie.name,
            storeId: cookie.storeId
          });
          console.log(`[Background]   ✓ Removed cookie: ${cookie.name} from ${url}`);
        }
      }
    }
  } catch (error) {
    console.error('[Background] ❌ Error removing cookies:', error);
  }
}

// NEW: Monitor login tab for completion
async function startLoginMonitoring(tabId) {
  console.log('[Background] 🔍 Starting login monitoring for tab:', tabId);
  loginTabId = tabId;
  isWaitingForLogin = true;

  // Clear any existing interval
  if (loginCheckInterval) {
    clearInterval(loginCheckInterval);
  }

  // Check for auth every second
  loginCheckInterval = setInterval(async () => {
    console.log('[Background] ⏰ Checking for login...');
    const authData = await getCookiesDirectly();

    if (authData?.isAuthenticated) {
      console.log('[Background] ✅ Login detected!');
      clearInterval(loginCheckInterval);
      loginCheckInterval = null;
      isWaitingForLogin = false;
      loginTabId = null;

      // Notify all tabs
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'authStatusChanged',
          isAuthenticated: true,
          sessionToken: authData.sessionToken,
          cookies: authData.cookies
        }).catch(() => { });
      });
    }
  }, 1000); // Check every second

  // Stop after 5 minutes
  setTimeout(() => {
    if (loginCheckInterval) {
      clearInterval(loginCheckInterval);
      loginCheckInterval = null;
      isWaitingForLogin = false;
      loginTabId = null;
      console.log('[Background] ⏱️ Login monitoring timeout');
    }
  }, 300000);
}

// Listen for tab updates (when login completes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isWaitingForLogin && tabId === loginTabId && changeInfo.status === 'complete') {
    console.log('[Background] 🔄 Login tab updated, checking auth...');
    getCookiesDirectly();
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed/updated');
  await initStation();
  await restoreTokenFromStorage();

  setTimeout(async () => {
    await fetchAuthViaNobstacleTab();
  }, 1000);
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Browser started');
  await initStation();
  await restoreTokenFromStorage();

  setTimeout(async () => {
    await fetchAuthViaNobstacleTab();
  }, 2000);
});

initStation();
restoreTokenFromStorage();

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

  if (request.action === 'authCookiesFromNobstacle') {
    console.log('[Background] 🍪 Received auth from nobstacle.com');
    console.log('[Background]   Has session data:', !!request.sessionData);
    console.log('[Background]   Has user:', !!request.user);
    console.log('[Background]   Timestamp:', new Date(request.timestamp).toISOString());

    (async () => {
      const sessionData = request.sessionData;
      const user = request.user;

      if (sessionData && user) {
        console.log('[Background] ✅ Valid session received');
        console.log('[Background]   User email:', user.email);
        console.log('[Background]   User roles:', user.Roles);

        // Store in chrome.storage
        const authData = {
          authSessionToken: 'session-from-api', // Dummy token since we can't read real one
          authCookies: [],
          authTimestamp: Date.now(),
          isAuthenticated: true,
          sessionData: sessionData,
          user: user,
          userEmail: user.email,
          userRoles: user.Roles,
          companyId: user.companyId
        };

        // Clear cooldown upon successful new login
        await chrome.storage.local.remove(['justLoggedOut', 'justLoggedOutTime']);
        await chrome.storage.local.set(authData);
        console.log('[Background] ✅ Auth data cached in storage');

        // Notify ALL content scripts on all tabs
        const tabs = await chrome.tabs.query({});
        console.log('[Background] 📢 Notifying', tabs.length, 'tabs');

        for (const tab of tabs) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'authStatusChanged',
              isAuthenticated: true,
              sessionToken: 'session-from-api',
              cookies: [],
              sessionData: sessionData,
              user: user
            });
            console.log('[Background]   ✓ Notified tab', tab.id);
          } catch (err) {
            // Tab doesn't have content script, ignore
          }
        }

        sendResponse({ success: true });
      } else {
        console.log('[Background] ⚠️ No valid session - user logged out');

        await clearSessionCookies();

        await chrome.storage.local.set({
          isAuthenticated: false,
          authTimestamp: Date.now(),
          authSessionToken: null,
          authCookies: [],
          sessionData: null,
          user: null,
          justLoggedOut: true,
          justLoggedOutTime: Date.now()
        });

        // Notify tabs of logout
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'authStatusChanged',
              isAuthenticated: false
            });
          } catch (err) {
            // Ignore
          }
        }

        sendResponse({ success: false });
      }
    })();

    return true;
  }

  if (request.action === 'forceAuthCheck') {
    console.log('[Background] 🔄 Force auth check - fetching fresh cookies...');

    (async () => {
      // Check if we just logged out
      const logoutCheck = await chrome.storage.local.get(['justLoggedOut', 'justLoggedOutTime']);
      if (logoutCheck.justLoggedOut && logoutCheck.justLoggedOutTime) {
        const elapsed = Date.now() - logoutCheck.justLoggedOutTime;
        if (elapsed < 8000) {
          console.log(`[Background] 🕒 Ignoring forceAuthCheck (cooldown active: ${elapsed}ms ago)`);
          sendResponse({
            sessionToken: null,
            cookies: [],
            isAuthenticated: false
          });
          return;
        } else {
          // Cooldown expired, clean it up
          await chrome.storage.local.remove(['justLoggedOut', 'justLoggedOutTime']);
        }
      }

      // FIRST: Try to get cookies directly (most reliable)
      let authData = await getCookiesDirectly();

      // SECOND: If no cookies found, try fetching from nobstacle.com tab
      if (!authData || !authData.isAuthenticated) {
        console.log('[Background] No cookies found, trying nobstacle.com tab...');
        await fetchAuthViaNobstacleTab();

        // Wait a bit for the tab to respond
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try getting cookies again
        authData = await getCookiesDirectly();
      }

      // THIRD: If still no auth, check storage as fallback
      if (!authData || !authData.isAuthenticated) {
        const result = await chrome.storage.local.get([
          'authSessionToken',
          'authCookies',
          'isAuthenticated',
          'authTimestamp'
        ]);

        authData = {
          sessionToken: result.authSessionToken || null,
          cookies: result.authCookies || [],
          isAuthenticated: result.isAuthenticated || false
        };
      }

      sendResponse(authData);
    })();

    return true; // Keep channel open for async response
  }

  if (request.action === 'getStation') {
    chrome.storage.local.get([STATION_STORAGE_KEY], (result) => {
      const station = result[STATION_STORAGE_KEY] ? String(result[STATION_STORAGE_KEY]) : "1";
      currentStation = station;
      sendResponse({ success: true, station: station });
    });
    return true;
  }

  if (request.action === 'setStation') {
    const newStation = String(request.station);
    chrome.storage.local.set({ [STATION_STORAGE_KEY]: newStation }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        currentStation = newStation;
        sendResponse({ success: true, station: newStation });
      }
    });
    return true;
  }

  if (request.action === 'getAuthData') {
    (async () => {
      const authData = await getCookiesDirectly();
      sendResponse(authData || {
        sessionToken: null,
        cookies: [],
        isAuthenticated: false
      });
    })();
    return true;
  }

  if (request.action === 'refreshAuth') {
    getCookiesDirectly().then(authData => {
      sendResponse(authData || { sessionToken: null, cookies: [], isAuthenticated: false });
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
    chrome.tabs.create({ url: request.url }, (tab) => {
      // Start monitoring this tab for login
      if (request.url.includes('nobstacle.com')) {
        startLoginMonitoring(tab.id);
      }
      sendResponse({ success: true, tabId: tab.id });
    });
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
    // Just start the interval, tab is already open
    if (!loginCheckInterval) {
      loginCheckInterval = setInterval(async () => {
        const authData = await getCookiesDirectly();
        if (authData?.isAuthenticated) {
          clearInterval(loginCheckInterval);
          loginCheckInterval = null;
        }
      }, 1000);
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'stopLoginMonitoring') {
    if (loginCheckInterval) {
      clearInterval(loginCheckInterval);
      loginCheckInterval = null;
    }
    isWaitingForLogin = false;
    loginTabId = null;
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STATION_STORAGE_KEY]) {
    currentStation = String(changes[STATION_STORAGE_KEY].newValue);
  }
});

// Periodic auth refresh (every 30 seconds - more frequent)
setInterval(async () => {
  console.log('[Background] ⏰ Periodic auth check...');
  await getCookiesDirectly();
}, 30000);

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

setInterval(() => {
  if (tokenExpiry && tokenExpiry < Date.now()) {
    backendAccessToken = null;
    tokenExpiry = null;
    chrome.storage.local.remove(['backendToken', 'backendTokenExpiry']);
  }
}, 60000);