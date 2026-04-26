const API_BASE = 'http://83.242.96.175:5002';

let startTime = Date.now();
let isActive = true;

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

async function getAnonId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['anonId'], (result) => {
      resolve(result.anonId);
    });
  });
}

function getPageText() {
  const article = document.querySelector('article');
  if (article) return article.innerText.substring(0, 5000);
  const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
  let text = '';
  elements.forEach(el => text += el.innerText + ' ');
  return text.substring(0, 5000);
}

async function sendPageForRecommendation() {
  const text = getPageText();
  if (!text || text.length < 100) return;
  const anonId = await getAnonId();
  if (!anonId) return;

  // ========== ТЕСТОВЫЕ ДАННЫЕ (МОК) ==========
  const testRecommendations = [
    {
      title: "Как отсортировать список в Python?",
      link: "https://stackoverflow.com/questions/12345/отсортировать-список-python",
      score: 245,
      answer_count: 12
    },
    {
      title: "Что такое list comprehension?",
      link: "https://stackoverflow.com/questions/67890/list-comprehension",
      score: 189,
      answer_count: 8
    },
    {
      title: "В чем разница между sort() и sorted()?",
      link: "https://stackoverflow.com/questions/11121/sort-vs-sorted",
      score: 342,
      answer_count: 15
    }
  ];
  showRecommendations(testRecommendations);
  // ==========================================

  // Оригинальный код вызова API закомментирован
  /*
  const url = window.location.href;
  const title = document.title;
  try {
    const response = await fetch(`${API_BASE}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title, text, anon_id: anonId })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.recommendations && data.recommendations.length > 0) {
        showRecommendations(data.recommendations);
      }
    }
  } catch (error) {
    console.error(error);
  }
  */
}

function showRecommendations(recommendations) {
  const oldBox = document.getElementById('yt-so-recommend');
  if (oldBox) oldBox.remove();

  const box = document.createElement('div');
  box.id = 'yt-so-recommend';
  box.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 340px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    z-index: 10001;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    border: 1px solid #e1e4e8;
    overflow: hidden;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    background: #4a76a8;
    color: white;
    padding: 10px 12px;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = `
    <span>📚 Похожие вопросы на StackOverflow</span>
    <button id="yt-so-close" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">&times;</button>
  `;

  const list = document.createElement('div');
  list.style.padding = '8px 12px';

  recommendations.forEach(rec => {
    const item = document.createElement('div');
    item.style.margin = '8px 0';
    item.innerHTML = `
      <a href="${rec.link}" target="_blank" style="color: #4a76a8; text-decoration: none; font-weight: 500;">
        ${rec.title}
      </a>
      <div style="font-size: 12px; color: #586069; margin-top: 2px;">
        ⭐ ${rec.score} | 💬 ${rec.answer_count} ответов
      </div>
    `;
    list.appendChild(item);
  });

  box.appendChild(header);
  box.appendChild(list);
  document.body.appendChild(box);

  document.getElementById('yt-so-close').onclick = () => box.remove();
  setTimeout(() => {
    const stillThere = document.getElementById('yt-so-recommend');
    if (stillThere) stillThere.remove();
  }, 15000);
}

setTimeout(sendPageForRecommendation, 4000);
