document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const toggleBtn = document.getElementById('toggleBtn');

  chrome.storage.local.get(['trackingEnabled'], (result) => {
    const enabled = result.trackingEnabled === true;
    updateUI(enabled);
  });

  toggleBtn.addEventListener('click', () => {
    chrome.storage.local.get(['trackingEnabled'], (result) => {
      const newState = !result.trackingEnabled;
      chrome.storage.local.set({ trackingEnabled: newState }, () => {
        updateUI(newState);
        chrome.runtime.sendMessage({ type: 'TRACKING_TOGGLE', enabled: newState });
      });
    });
  });

  function updateUI(enabled) {
    if (enabled) {
      statusDiv.textContent = 'Отслеживание активно';
      statusDiv.className = 'status on';
      toggleBtn.textContent = 'Отключить отслеживание';
    } else {
      statusDiv.textContent = 'Отслеживание отключено';
      statusDiv.className = 'status off';
      toggleBtn.textContent = 'Включить отслеживание';
    }
  }
});
