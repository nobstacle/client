// Background service worker
// Service workers don't have access to DOM, so no document/window usage here

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Nobstacle Header extension installed');
  
  if (details.reason === 'install') {
    // First time installation
    console.log('Extension installed for the first time');
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Extension updated');
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'HEADER_READY') {
    console.log('Header loaded on tab:', sender.tab?.id);
    sendResponse({ success: true });
  }
  
  if (request.action === 'toggle') {
    console.log('Toggle requested for tab:', sender.tab?.id);
    sendResponse({ success: true });
  }
  
  // Handle cookie requests
  if (request.action === 'getCookies') {
    chrome.cookies.getAll({ domain: request.domain }, (cookies) => {
      sendResponse({ cookies: cookies });
    });
    return true; // Keep channel open for async response
  }
  
  return true;
});