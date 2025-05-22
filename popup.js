document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get(['trackingData'], function(result) {
    const data = result.trackingData || [];
    const popupContent = document.getElementById('popup-content');

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
  });
});
