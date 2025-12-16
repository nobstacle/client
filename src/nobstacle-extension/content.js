// Configuration
const Isproduction = true;
const HEADER_URL = Isproduction
  ? 'https://nobstacle.com/header-only'
  : 'http://localhost:3000/header-only';
const HEADER_HEIGHT = '56px';
const DEBUG_MODE = false;
let isEnabled = true;
let headerInjected = false;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let selectedCategory = null;
let categoriesData = [];
let categoriesFetched = false;

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
      document.getElementById('nobstacle-category-dropdown')?.remove(); // ✅ NEW
      document.body.style.marginTop = `${window.nobstacleOriginalMargin}px`;
      headerInjected = false;
      respond({ injected: false });
    }
    return true;
  }

   if (req.action === 'triggerUpsell') {
    console.log('[Content Script] Wallet icon clicked, sending upsell for category:', selectedCategory);
    
    const iframe = document.getElementById('nobstacle-header-iframe');
    if (iframe) {
      iframe.contentWindow.postMessage({
        type: 'SEND_UPSELL_PACKAGES',
        categoryId: selectedCategory
      }, '*');
      console.log('[Content Script] ✓ Upsell message sent to iframe');
    } else {
      console.error('[Content Script] ERROR: Header iframe not found!');
    }
    
    respond({ success: true, category: selectedCategory });
    return true;
  }

  if (req.action === 'showCategories') {
    console.log('[Content Script] Show categories requested');
    
    if (categoriesData.length === 0 && !categoriesFetched) {
      fetchCategories().then(categories => {
        if (categories.length > 0) {
          createCategoryDropdown(categories);
        }
      });
    } else if (categoriesData.length > 0) {
      createCategoryDropdown(categoriesData);
    }
    
    respond({ success: true });
    return true;
  }
});

function isInputFocused() {
  const activeElement = document.activeElement;
  const inputs = ['input', 'textarea', 'select'];
  return inputs.includes(activeElement?.tagName?.toLowerCase()) || 
         activeElement?.isContentEditable;
}

function setupKeyboardListener() {
  document.addEventListener('keydown', (e) => {
    // Check if user typed '/' and not in an input field
    if (e.key === '/' && !isInputFocused()) {
      e.preventDefault();
      console.log('[Content Script] "/" key pressed - showing categories');
      
      if (categoriesData.length === 0 && !categoriesFetched) {
        fetchCategories().then(categories => {
          if (categories.length > 0) {
            createCategoryDropdown(categories);
          } else {
            alert('No categories found. Please try again.');
          }
        });
      } else if (categoriesData.length > 0) {
        createCategoryDropdown(categoriesData);
      } else {
        alert('No categories available.');
      }
    }
  });
  
  console.log('[Content Script] ✓ Keyboard listener for "/" added');
}

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

function createCategoryDropdown(categories) {
  // Remove existing dropdown
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

  // Sort categories by priceLevel
  const sortedCategories = [...categories].sort((a, b) =>
    (a.priceLevel || 0) - (b.priceLevel || 0)
  );

  // ✅ IMPROVED: Better visual feedback for selected category
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
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: ${isSelected ? '#10b981' : '#3b5998'};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: ${isSelected ? '16px' : '12px'};
          font-weight: 600;
          transition: all 0.2s;
        ">
          ${isSelected ? '✓' : (category.priceLevel || '?')}
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
      ${selectedCategory ? `
      <button 
        id="send-upsell-btn"
        style="
          flex: 1;
          padding: 10px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        "
      >
        Send Packages
      </button>
      ` : ''}
    </div>
  `;

  document.body.appendChild(dropdown);

  // ✅ FIXED: Attach click handlers properly
  setTimeout(() => {
    const categoryItems = dropdown.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
      item.addEventListener('click', () => {
        const categoryId = parseInt(item.getAttribute('data-category-id'));
        selectedCategory = categoryId;

        console.log(`[Content Script] ✓ Category selected: ${categoryId}`);

        // ✅ NEW: Send to iframe for state sync
        const iframe = document.getElementById('nobstacle-header-iframe');
        if (iframe) {
          iframe.contentWindow.postMessage({
            type: 'CATEGORY_SELECTED',
            categoryId: categoryId
          }, '*');
        }

        // ✅ NEW: Notify popup to update UI
        chrome.runtime.sendMessage({
          action: 'categorySelected',
          categoryId: categoryId
        });

        // Close dropdown after brief delay
        setTimeout(() => {
          dropdown.remove();
        }, 300);
      });

      // Hover effect
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

    // Clear button
    const clearBtn = dropdown.querySelector('#clear-category-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        selectedCategory = null;
        console.log('[Content Script] Category selection cleared');
        
        // Notify iframe
        const iframe = document.getElementById('nobstacle-header-iframe');
        if (iframe) {
          iframe.contentWindow.postMessage({
            type: 'CATEGORY_SELECTED',
            categoryId: null
          }, '*');
        }
        
        // Notify popup
        chrome.runtime.sendMessage({
          action: 'categorySelected',
          categoryId: null
        });
        
        dropdown.remove();
      });
    }

    // ✅ NEW: Send packages button
    const sendBtn = dropdown.querySelector('#send-upsell-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        console.log('[Content Script] Sending packages for category:', selectedCategory);
        
        // Send to iframe to handle the upsell
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

    // Close on outside click
    const closeHandler = (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    document.addEventListener('mousedown', closeHandler);

    // ✅ NEW: Close on Escape key
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
    console.log('[Content Script] Using cached categories');
    return categoriesData;
  }

  try {
    console.log('[Content Script] Fetching categories...');
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
      console.log(`[Content Script] ✓ Fetched ${categoriesData.length} categories`);
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
    console.log('[Content Script] Requesting microphone permission...');

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('[Content Script] ✓ Microphone permission granted');

    audioChunks = [];

    const mimeType = getSupportedMimeType();
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('[Content Script] Recording stopped, processing audio...');
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      await sendAudioToBackend(audioBlob);

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    console.log('[Content Script] ✓ Recording started');

    // Show recording indicator
    createRecordingIndicator({ text: 'Recording... Speak now' });

    // Update mic button in popup
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
    console.log('[Content Script] Stopping recording...');
    mediaRecorder.stop();
    isRecording = false;

    // Remove recording indicator
    document.getElementById('nobstacle-recording-indicator')?.remove();

    // Update mic button in popup
    updateMicButtonState(false);

    return true;
  }
  return false;
}

async function sendAudioToBackend(audioBlob) {
  try {
    console.log('[Content Script] Sending audio to backend...');

    const iframe = document.getElementById('nobstacle-header-iframe');
    if (!iframe) {
      console.error('[Content Script] ERROR: Iframe not found');
      return;
    }

    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result.split(',')[1];

      // Send to iframe for processing
      iframe.contentWindow.postMessage({
        type: 'PROCESS_AUDIO',
        audioData: base64Audio,
        mimeType: audioBlob.type
      }, '*');

      console.log('[Content Script] ✓ Audio sent to iframe for processing');
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
    const micButton = popup.querySelector('#chat-mic-button');
    const clearButton = popup.querySelector('#chat-clear-button');
    const closeButton = popup.querySelector('#chat-close-button');
    const endSessionButton = popup.querySelector('#chat-end-session-button');

    console.log('[Content Script] Found elements:', {
      messageInput: !!messageInput,
      sendButton: !!sendButton,
      micButton: !!micButton,
      clearButton: !!clearButton,
      closeButton: !!closeButton,
      endSessionButton: !!endSessionButton
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

    // Microphone button handler
    if (micButton) {
      micButton.addEventListener('click', async () => {
        console.log('[Content Script] Mic button clicked');

        if (!isRecording) {
          // Start recording
          const started = await startAudioRecording();
          if (started) {
            console.log('[Content Script] ✓ Recording started successfully');
          }
        } else {
          // Stop recording
          const stopped = stopAudioRecording();
          if (stopped) {
            console.log('[Content Script] ✓ Recording stopped successfully');
          }
        }
      });
      console.log('[Content Script] ✓ Mic button listener attached');
    }
    // Clear button handler
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        console.log('[Content Script] Clear button clicked');
        iframe.contentWindow.postMessage({
          type: 'CHAT_CLEAR'
        }, '*');
      });
      console.log('[Content Script] ✓ Clear button listener attached');
    }

    // End Session button handler
    if (endSessionButton) {
      endSessionButton.addEventListener('click', () => {
        console.log('[Content Script] End Session button clicked');
        iframe.contentWindow.postMessage({
          type: 'CHAT_END_SESSION'
        }, '*');
        popup.remove();
      });
      console.log('[Content Script] ✓ End Session button listener attached');
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
   setupKeyboardListener();
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
      console.log('[Content Script] Updating chat messages');
      const popup = document.getElementById('nobstacle-chat-popup');
      if (popup) {
        const messagesContainer = popup.querySelector('#chat-messages-container');
        if (messagesContainer) {
          messagesContainer.innerHTML = event.data.html;
          // Auto-scroll to bottom
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          console.log('[Content Script] ✓ Messages updated and scrolled');
        }
      }
    }

    if (event.data.type === 'CHAT_SEND_MESSAGE') {
      const messageText = event.data.message;
      console.log('[Content Script] Chat message to send:', messageText);

      // Forward directly to iframe - no need for intermediate PROCESS_CHAT_MESSAGE
      iframe.contentWindow.postMessage({
        type: 'CHAT_SEND_MESSAGE',
        message: messageText
      }, '*');

      console.log('[Content Script] ✓ Message forwarded to iframe');
    }

    if (event.data.type === 'CHAT_CLEAR') {
      console.log('[Content Script] Chat clear request');
      // Forward to iframe to clear message store
      iframe.contentWindow.postMessage({
        type: 'CHAT_CLEAR'
      }, '*');
      console.log('[Content Script] ✓ Clear request forwarded to iframe');
    }

    if (event.data.type === 'CHAT_POPUP_CLOSED') {
      console.log('[Content Script] Chat popup closed by user');
      document.getElementById('nobstacle-chat-popup')?.remove();
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

    if (event.data.type === 'CHAT_RECORDING_STATE') {
      console.log('[Content Script] Recording state update:', event.data.isRecording);
      const popup = document.getElementById('nobstacle-chat-popup');
      if (popup) {
        const micButton = popup.querySelector('#chat-mic-button');
        if (micButton) {
          micButton.setAttribute('data-recording', event.data.isRecording ? 'true' : 'false');
          micButton.style.background = event.data.isRecording ? '#ef4444' : '#3b5998';

          // Update icon
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

    if (event.data.type === 'PROCESS_AUDIO') {
      console.log('[Content Script] Audio processing requested');
    }

    if (event.data.type === 'AUDIO_TRANSCRIPTION') {
      console.log('[Content Script] Received transcription:', event.data.text);

      const popup = document.getElementById('nobstacle-chat-popup');
      if (popup) {
        const messageInput = popup.querySelector('#chat-message-input');
        if (messageInput && event.data.text) {
          // Set the value in the input field
          messageInput.value = event.data.text;
          console.log('[Content Script] ✓ Transcription inserted into input');

          // Automatically send the message
          const iframe = document.getElementById('nobstacle-header-iframe');
          if (iframe) {
            iframe.contentWindow.postMessage({
              type: 'CHAT_SEND_MESSAGE',
              message: event.data.text
            }, '*');

            // Clear the input after sending
            messageInput.value = '';
            console.log('[Content Script] ✓ Message automatically sent');
          }
        }
      }
    }

    if (event.data.type === 'SHOW_CATEGORIES') {
      if (categoriesData.length === 0) {
        fetchCategories().then(categories => {
          if (categories.length > 0) {
            createCategoryDropdown(categories);
          }
        });
      } else {
        createCategoryDropdown(categoriesData);
      }
    }

    if (event.data.type === 'TRIGGER_UPSELL') {
      // This will be sent from iframe when user clicks upsell icon
      const iframe = document.getElementById('nobstacle-header-iframe');
      if (iframe) {
        iframe.contentWindow.postMessage({
          type: 'SEND_UPSELL_PACKAGES',
          categoryId: selectedCategory
        }, '*');
      }
    }
  };

  window.addEventListener('message', handler);
  addDebugLog('✓ Header injection complete');
}