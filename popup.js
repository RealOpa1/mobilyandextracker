document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const toggleBtn = document.getElementById('toggleBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  const loginBtn = document.getElementById('loginBtn');
  const currentSiteDiv = document.getElementById('currentSite');

  chrome.storage.local.get(['token', 'trackingEnabled', 'userId'], (result) => {
    updateUI(result);
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      currentSiteDiv.textContent = `Текущий сайт: ${new URL(tabs[0].url).hostname}`;
    }
  });

  toggleBtn.addEventListener('click', () => {
    chrome.storage.local.get(['trackingEnabled'], (result) => {
      const newState = !result.trackingEnabled;
      chrome.storage.local.set({ trackingEnabled: newState }, () => {
        updateUI({ trackingEnabled: newState });
        chrome.runtime.sendMessage({ type: 'TRACKING_TOGGLE', enabled: newState });
      });
    });
  });

  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  loginBtn.addEventListener('click', () => {
    chrome.storage.local.get(['apiUrl'], (result) => {
      const loginUrl = (result.apiUrl || 'https://ваш-сервер.com') + '/mobile/login';
      chrome.tabs.create({ url: loginUrl });
    });
  });

  function updateUI(data) {
    const { token, trackingEnabled, userId } = data;

    if (!token || !userId) {
      statusDiv.textContent = 'Не авторизован';
      statusDiv.className = 'status unauthenticated';
      toggleBtn.style.display = 'none';
      loginBtn.style.display = 'block';
    } else {
      loginBtn.style.display = 'none';
      toggleBtn.style.display = 'block';
      if (trackingEnabled) {
        statusDiv.textContent = 'Отслеживание активно';
        statusDiv.className = 'status active';
        toggleBtn.textContent = 'Отключить отслеживание';
        toggleBtn.className = 'btn-secondary';
      } else {
        statusDiv.textContent = 'Отслеживание отключено';
        statusDiv.className = 'status inactive';
        toggleBtn.textContent = 'Включить отслеживание';
        toggleBtn.className = 'btn-primary';
      }
    }
  }
});
