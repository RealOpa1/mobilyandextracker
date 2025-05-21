
function trackSearchQueries() {
  const searchInput = document.querySelector('input[name="text"]');
  if (searchInput) {
    searchInput.addEventListener('change', () => {
      chrome.runtime.sendMessage({
        type: 'yandex_search',
        query: searchInput.value,
        timestamp: new Date().toISOString()
      });
    });
  }
}

function trackSearchClicks() {
  const results = document.querySelectorAll('.serp-item, .organic__url');
  results.forEach(item => {
    item.addEventListener('click', () => {
      const url = item.querySelector('a')?.href || '';
      if (url.includes('yandex.ru')) return;
      
      chrome.runtime.sendMessage({
        type: 'yandex_click',
        url: url,
        position: Array.from(results).indexOf(item) + 1
      });
    });
  });
}

let pageLoadTime = new Date();

window.addEventListener('beforeunload', () => {
  chrome.runtime.sendMessage({
    type: 'yandex_time_spent',
    duration: (new Date() - pageLoadTime) / 1000 
  });
});

if (window.location.hostname.includes('yandex.ru')) {
  trackSearchQueries();
  trackSearchClicks();
  
  const observer = new MutationObserver(() => {
    trackSearchClicks();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
