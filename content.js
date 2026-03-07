
let startTime = Date.now();
let isActive = true;
let sessionId = null;

chrome.runtime.sendMessage({ type: 'PAGE_LOAD', url: window.location.href });

document.addEventListener('visibilitychange', () => {
  isActive = !document.hidden;
  if (isActive) {
    startTime = Date.now(); 
  } else {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    chrome.runtime.sendMessage({
      type: 'PAGE_HIDE',
      duration,
      url: window.location.href
    });
  }
});

['click', 'scroll', 'keydown', 'mousemove'].forEach(eventType => {
  document.addEventListener(eventType, () => {
    if (isActive) {
      chrome.runtime.sendMessage({ type: 'USER_ACTIVE' });
    }
  }, { passive: true });
});

window.addEventListener('beforeunload', () => {
  const duration = Math.floor((Date.now() - startTime) / 1000);
  chrome.runtime.sendMessage({
    type: 'PAGE_UNLOAD',
    duration,
    url: window.location.href
  });
});
