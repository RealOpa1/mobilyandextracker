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
    const baseUrl = apiUrlInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!baseUrl || !username || !password) {
      showMessage('Заполните все поля', 'error');
      return;
    }

    const loginUrl = `${baseUrl}/api/login`;

    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка ${response.status}`);
      }

      const data = await response.json();

      if (data.token) {
        await chrome.storage.local.set({
          apiUrl: baseUrl,   
          username,
          token: data.token,
          userId: data.user_id,
          trackingEnabled: data.tracking_enabled || false,
          educationalSites: data.educational_sites || []
        });
        showMessage('Успешный вход!', 'success');
        passwordInput.value = '';
      } else {
        showMessage('Ошибка авторизации: неверный ответ сервера', 'error');
      }
    } catch (error) {
      console.error(error);
      showMessage('Ошибка соединения с сервером: ' + error.message, 'error');
    }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['token', 'userId', 'username', 'educationalSites', 'apiUrl'], () => {
      showMessage('Вы вышли из системы', 'success');
      apiUrlInput.value = '';
      usernameInput.value = '';
      passwordInput.value = '';
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
