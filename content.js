
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
//   Извлекаем текст
function getPageText() {
    const article = document.querySelector('article');
    if (article) return article.innerText.substring(0, 5000);

    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    let text = '';
    elements.forEach(el => text += el.innerText + ' ');
    return text.substring(0, 5000);
}

async function sendPageForRecommendation() {
    const text = getPageText();
    if (!text || text.length < 100) return; 
    
    const url = window.location.href;
    const title = document.title;
    
    try {
        const response = await fetch('http://ваш-сервер.com/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, title, text })
        });
        
        if (response.ok) {
            const recommendations = await response.json();
            showRecommendations(recommendations);
        }
    } catch (error) {
        console.error('Ошибка отправки на рекомендации:', error);
    }
}

function showRecommendations(recommendations) {
    if (recommendations.length > 0) {
        const message = '📚 Похожие статьи:\n' + 
            recommendations.map((r, i) => `${i+1}. ${r.title}\n   ${r.url}`).join('\n');
        alert(message);
    }
    
  
}

setTimeout(sendPageForRecommendation, 3000); // ждём 3 секунды после загрузки
