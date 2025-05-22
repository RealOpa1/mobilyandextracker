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

let trackingData = [];

chrome.webRequest.onCompleted.addListener(
  function(details) {
    const url = details.url;
    const domain = new URL(url).hostname;

    if (allowedDomains.includes(domain)) {
      console.log('Посещен учебный сайт:', url);
      const timestamp = Date.now();
      trackingData.push({ url: url, timestamp: timestamp });
      chrome.storage.local.set({ trackingData: trackingData });
     
    }
  },
  { urls: ['<all_urls>'] }
);


async function sendDataToBackend(url, timestamp) {
  const backendUrl = 'http://localhost:3000/api/track'; // Замените на URL вашего бэкенда!

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url, timestamp: timestamp })
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

function updatePopup() {
  chrome.storage.local.get(['trackingData'], function(result) {
    const data = result.trackingData || [];
    const popupContent = document.getElementById('popup-content'); 
    if (popupContent) {
    popupContent.innerHTML = ''; 
    if (data.length === 0) {
      popupContent.textContent = 'Нет данных для отображения.';
    } else {
      const list = document.createElement('ul');
      data.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `${new Date(item.timestamp).toLocaleString()} - ${item.url}`;
        list.appendChild(listItem);
      });
      popupContent.appendChild(list);
    }
  }
  });
}
