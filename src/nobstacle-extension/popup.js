// Popup script - runs when user clicks extension icon
document.addEventListener('DOMContentLoaded', () => {
  const openDashboardBtn = document.getElementById('openDashboard');
  
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://nobstacle.com/dashboard' });
    });
  }
});