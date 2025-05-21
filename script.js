document.addEventListener('DOMContentLoaded', function() {
  const urlInput = document.getElementById('urlInput');
  const loadButton = document.getElementById('loadButton');
  const targetFrame = document.getElementById('targetFrame');
  const allowedDomains = [
    'stackoverflow.com',
    'github.com',
    'checkio.org',
    'kaggle.com',
    'coursera.org',
    'codecademy.com',
    'pythontutor.com',
    'codewars.com',
    'python.org',
    'skillbox.ru',
    'wikipedia.org',
    'stepik.org'
  ];
  let startTime = null; // Время начала посещения сайта

  loadButton.addEventListener('click', function() {
    const url = urlInput.value;
    targetFrame.src = url;
    startTime = null; // Сброс времени при загрузке нового URL
  });

  targetFrame.addEventListener('load', function() {
    const currentUrl = targetFrame.contentWindow.location.href;
    const domain = new URL(currentUrl).hostname; // Получаем домен сайта

    if (allowedDomains.includes(domain)) {
      console.log('Посещен учебный сайт:', currentUrl);
      startTime = Date.now(); // Фиксируем время начала посещения
    } else {
      console.log('Посещен сайт (не учебный):', currentUrl);
      startTime = null; // Сбрасываем время, если сайт не учебный
    }
  });

  // Отслеживаем уход со страницы (например, закрытие вкладки или переход на другой сайт)
  window.addEventListener('beforeunload', function() {
    if (startTime) {
      const endTime = Date.now();
      const timeSpent = endTime - startTime;
      const currentUrl = targetFrame.contentWindow.location.href; // Получаем текущий URL еще раз
      sendDataToBackend(currentUrl, timeSpent);
    }
  });

  async function sendDataToBackend(url, timeSpent) {
    const backendUrl = 'http://localhost:3000/api/track'; // Замените на URL вашего бэкенда!

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url, timeSpent: timeSpent, timestamp: Date.now() })
      });

      if (!response.ok) {
        console.error('Ошибка отправки данных на бэкенд:', response.status);
      } else {
        console.log('Данные успешно отправлены на бэкенд');
      }
    } catch (error) {
      console.error('Ошибка отправки данных на бэкенд:', error);
    }
  }
});
