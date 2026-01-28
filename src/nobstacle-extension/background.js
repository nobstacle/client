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

      const cookies = await chrome.cookies.getAll({
        domain: 'nobstacle.com'
      });

      console.log('[Background] 📦 Found cookies:', cookies.length);

      const sessionCookie = cookies.find(c =>
        c.name === '__Secure-next-auth.session-token' ||
        c.name === 'next-auth.session-token'
      );

      if (sessionCookie) {
        console.log('[Background] ✅ Session cookie found!');
        await handleAuthCookiesReceived(cookies);
        return {
          sessionToken: sessionCookie.value,
          cookies: cookies,
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
      console.log('[Background] 🍪 Received auth cookies from nobstacle.com');
      handleAuthCookiesReceived(request.cookies).then((success) => {
        sendResponse({ success });
      });
      return true;
    }

    if (request.action === 'forceAuthCheck') {
      console.log('[Background] 🔄 Force auth check - fetching fresh cookies...');

      (async () => {
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