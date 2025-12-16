// popup.js - Enhanced with category selection and upsell trigger
let currentCategoryId = null;
let currentCategoryName = null;

document.addEventListener('DOMContentLoaded', () => {
  const openDashboardBtn = document.getElementById('openDashboard');
  const showCategoriesBtn = document.getElementById('show-categories-btn');
  const triggerUpsellBtn = document.getElementById('trigger-upsell-btn');
  const categoryStatus = document.getElementById('category-status');
  const categoryNameSpan = document.getElementById('category-name');

  // Open Dashboard button
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://nobstacle.com/dashboard' });
    });
  }

  // Show Categories button - sends message to content script
  if (showCategoriesBtn) {
    showCategoriesBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'showCategories' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error showing categories:', chrome.runtime.lastError);
              alert('Unable to show categories. Make sure you\'re on a valid webpage.');
            }
          });

          // Visual feedback
          showCategoriesBtn.classList.add('selected');
          setTimeout(() => {
            showCategoriesBtn.classList.remove('selected');
          }, 300);
        }
      });
    });
  }

  // Trigger Upsell button - sends packages with optional category filter
  if (triggerUpsellBtn) {
    triggerUpsellBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: 'triggerUpsell',
              categoryId: currentCategoryId
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error('Error triggering upsell:', chrome.runtime.lastError);
                alert('Unable to send upsell packages. Make sure you\'re on a valid webpage.');
              } else {
                // Visual feedback
                triggerUpsellBtn.classList.add('selected');
                setTimeout(() => {
                  triggerUpsellBtn.classList.remove('selected');
                }, 300);

                // Show success message
                const originalText = triggerUpsellBtn.querySelector('span').textContent;
                triggerUpsellBtn.querySelector('span').textContent = 'Sent!';
                setTimeout(() => {
                  triggerUpsellBtn.querySelector('span').textContent = originalText;
                }, 1500);
              }
            }
          );
        }
      });
    });
  }

  // Load saved category selection if any
  chrome.storage.local.get(['selectedCategory', 'selectedCategoryName'], (result) => {
    if (result.selectedCategory) {
      currentCategoryId = result.selectedCategory;
      currentCategoryName = result.selectedCategoryName || `Category ${result.selectedCategory}`;
      updateCategoryDisplay();
    }
  });
});

// Listen for messages from content script (category selection updates)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'categorySelected') {
    currentCategoryId = request.categoryId;
    currentCategoryName = request.categoryName;

    // Save to storage for persistence
    if (currentCategoryId) {
      chrome.storage.local.set({
        selectedCategory: currentCategoryId,
        selectedCategoryName: currentCategoryName
      });
    } else {
      chrome.storage.local.remove(['selectedCategory', 'selectedCategoryName']);
    }

    updateCategoryDisplay();
    sendResponse({ success: true });
  }
  return true;
});

// Update the category display in popup
function updateCategoryDisplay() {
  const categoryStatus = document.getElementById('category-status');
  const categoryNameSpan = document.getElementById('category-name');
  const showCategoriesBtn = document.getElementById('show-categories-btn');

  if (currentCategoryId && currentCategoryName) {
    categoryStatus.classList.add('active');
    categoryNameSpan.textContent = currentCategoryName;
    showCategoriesBtn.classList.add('selected');
  } else {
    categoryStatus.classList.remove('active');
    categoryNameSpan.textContent = 'None';
    showCategoriesBtn.classList.remove('selected');
  }
}

// Optional: Add keyboard shortcut info
document.addEventListener('keydown', (e) => {
  // If user presses '/' while popup is open, show categories
  if (e.key === '/') {
    e.preventDefault();
    document.getElementById('show-categories-btn')?.click();
  }
  // If user presses 'u' while popup is open, trigger upsell
  if (e.key === 'u') {
    e.preventDefault();
    document.getElementById('trigger-upsell-btn')?.click();
  }
});