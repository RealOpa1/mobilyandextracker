
document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const saveBtn = document.getElementById('saveBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const messageDiv = document.getElementById('message');

  chrome.storage.local.get(['apiUrl', 'username'], (result) => {
    if (result.apiUrl) apiUrlInput.value = result.apiUrl;
    if (result.username) usernameInput.value = result.username;
  });

  saveBtn.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!apiUrl || !username || !password) {
      showMessage('Заполните все поля', 'error');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/mobile/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        await chrome.storage.local.set({
          apiUrl,
          username,
          token: data.token,
          userId: data.user_id,
          trackingEnabled: data.tracking_enabled || false,
          educationalSites: data.educational_sites || []
        });
        showMessage('Успешный вход!', 'success');
        passwordInput.value = '';
      } else {
        showMessage('Ошибка авторизации: ' + (data.error || 'Неверные данные'), 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['token', 'userId', 'username', 'educationalSites'], () => {
      showMessage('Вы вышли из системы', 'success');
    });
  });

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'status ' + type;
    setTimeout(() => {
      messageDiv.textContent = '';
      messageDiv.className = 'status';
    }, 3000);
  }
});
