// Configuration
const Isproduction = true;
const HEADER_URL = Isproduction ? 'https://nobstacle.com/header-only' : 'http://localhost:3000/header-only';
const HEADER_HEIGHT = '70px'; // Adjust based on your header height
const DEBUG_MODE = true;

// Check if we should inject on this page
function shouldInject() {
  // Don't inject on Nobstacle's own domain to avoid duplication
  if (window.location.hostname.includes('nobstacle.com')) {
    return false;
  }
  
  // Don't inject on chrome:// pages or extension pages
  if (window.location.protocol === 'chrome:' || 
      window.location.protocol === 'chrome-extension:') {
    return false;
  }
  
  return true;
}

// Inject CSS styles
function injectStyles() {
  if (document.getElementById('nobstacle-header-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'nobstacle-header-styles';
  style.textContent = `
    #nobstacle-header-container {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      z-index: 2147483647 !important;
      background: white !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    #nobstacle-header-iframe {
      display: block !important;
      width: 100% !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
  `;
  
  document.head.appendChild(style);
}

function injectDebugPanel() {
  if (!DEBUG_MODE) return;
  
  const debugPanel = document.createElement('div');
  debugPanel.id = 'nobstacle-debug-panel';
  debugPanel.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 10px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 11px;
    z-index: 2147483646;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  
  debugPanel.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">
      🔍 Nobstacle Extension Debug
    </div>
    <div style="line-height: 1.6;">
      <div>URL: <span style="color: #81C784;">${HEADER_URL}</span></div>
      <div>Mode: <span style="color: #FFB74D;">${Isproduction ? 'PRODUCTION' : 'DEVELOPMENT'}</span></div>
      <div>Injected: <span style="color: #4CAF50;">✓ Yes</span></div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #555;">
        <button onclick="document.getElementById('nobstacle-header-iframe').contentWindow.location.reload()" 
                style="padding: 4px 8px; background: #667eea; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; margin-right: 5px;">
          Reload Header
        </button>
        <button onclick="document.getElementById('nobstacle-debug-panel').remove()" 
                style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
          Hide
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(debugPanel);
}

// Create and inject the header
function injectHeader() {
  // Check if already injected
  if (document.getElementById('nobstacle-header-container')) {
    return;
  }
  
  // Inject styles first
  injectStyles();
  
  // Create container
  const container = document.createElement('div');
  container.id = 'nobstacle-header-container';
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'nobstacle-header-iframe';
  
  // Add credentials to allow cookie sharing
  iframe.setAttribute('credentialless', 'false');
  iframe.setAttribute('allow', 'cookies');
  
  iframe.src = HEADER_URL;
  iframe.style.cssText = `
    width: 100%;
    height: ${HEADER_HEIGHT};
    border: none;
    display: block;
    margin: 0;
    padding: 0;
  `;
  
  container.appendChild(iframe);
  
  // Listen for auth requests from iframe
  window.addEventListener('message', (event) => {
    // Only accept messages from our domain
    if (event.origin !== new URL(HEADER_URL).origin) return;
    
    if (event.data.type === 'REQUEST_AUTH') {
      // Get cookies from main domain and send to iframe
      chrome.runtime.sendMessage({ 
        action: 'getCookies',
        domain: new URL(HEADER_URL).hostname
      }, (response) => {
        iframe.contentWindow.postMessage({
          type: 'AUTH_DATA',
          cookies: response?.cookies
        }, event.origin);
      });
    }
  });
  
  // Insert at the very top of the page
  document.body.insertBefore(container, document.body.firstChild);
  
  // Push down the page content
  adjustPageContent();
    injectDebugPanel();
    
  console.log('Nobstacle header injected');
}

// Adjust page content to accommodate header
function adjustPageContent() {
  // Add margin to body to prevent content from going under header
  if (document.body) {
    const existingMargin = parseInt(window.getComputedStyle(document.body).marginTop) || 0;
    document.body.style.marginTop = `calc(${existingMargin}px + ${HEADER_HEIGHT})`;
  }
}

// Remove header (for toggling or cleanup)
function removeHeader() {
  const container = document.getElementById('nobstacle-header-container');
  if (container) {
    container.remove();
    
    // Reset body margin
    const currentMargin = parseInt(window.getComputedStyle(document.body).marginTop) || 0;
    const headerHeightPx = parseInt(HEADER_HEIGHT);
    document.body.style.marginTop = `${Math.max(0, currentMargin - headerHeightPx)}px`;
  }
}

// Initialize
if (shouldInject()) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHeader);
  } else {
    injectHeader();
  }
}

// Listen for messages (for future features like toggle)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    const container = document.getElementById('nobstacle-header-container');
    if (container) {
      removeHeader();
      sendResponse({ injected: false });
    } else {
      injectHeader();
      sendResponse({ injected: true });
    }
  }
  return true;
});