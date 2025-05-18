document.getElementById('trackButton').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: startTracking
  });
});

function startTracking() document.getElementById('trackButton').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: startTracking
  });
});

function startTracking() {
  const searchInput = document.querySelector('input[name="text"]');
  if (searchInput) {
    searchInput.addEventListener('change', () => {
      chrome.runtime.sendMessage({ 
        type: 'search_query', 
        query: searchInput.value 
      });
    });
  }
  console.log('Трекинг активирован!');
}
  const searchInput = document.querySelector('input[name="text"]');
  if (searchInput) {
    searchInput.addEventListener('change', () => {
      chrome.runtime.sendMessage({ 
        type: 'search_query', 
        query: searchInput.value 
      });
    });
  }
  console.log('Трекинг активирован!');
}
