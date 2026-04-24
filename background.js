

const API_BASE = 'http://83.242.96.175:5002/api';  

let educationalSites = [];
let activeTabs = {};

const DEFAULT_SITES = [
  'stackoverflow.com', 'github.com', 'checkio.org', 'kaggle.com',
  'coursera.org', 'codecademy.com', 'pythontutor.com', 'codewars.com',
  'python.org', 'skillbox.ru', 'wikipedia.org', 'stepik.org'
].map(domain => ({ domain, url_pattern: '' }));

let anonId = null;

async function getAnonId() {
  const result = await chrome.storage.local.get(['anonId']);
  if (result.anonId) {
    anonId = result.anonId;
  } else {
    anonId = crypto.randomUUID();
    await chrome.storage.local.set({ anonId });
  }
  return anonId;
}


async function init() {
  await getAnonId();
  educationalSites = [...DEFAULT_SITES];
  checkExistingTabs();
}

function isEducational(url) {
  if (!url || !educationalSites.length) return false;
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    return educationalSites.some(site =>
      domain.includes(site.domain) || (site.url_pattern && url.includes(site.url_pattern))
    );
  } catch {
    return false;
  }
}

async function sendVisit(data) {
  const trackingEnabled = (await chrome.storage.local.get('trackingEnabled')).trackingEnabled;
  if (!trackingEnabled) return;

  const id = await getAnonId();
  const visitData = {
    ...data,
    anon_id: id
  };

  try {
    await fetch(`${API_BASE}/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visitData)
    });
  } catch (error) {
    console.error('Ошибка отправки данных:', error);
    const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
    offlineQueue.push(visitData);
    chrome.storage.local.set({ offlineQueue });
  }
}

async function checkExistingTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && isEducational(tab.url)) {
      activeTabs[tab.id] = {
        url: tab.url,
        domain: new URL(tab.url).hostname,
        startTime: Date.now()
      };
      await sendVisit({
        url: tab.url,
        domain: new URL(tab.url).hostname,
        duration: 0,
        timestamp: new Date().toISOString(),
        action: 'page_view'
      });
    }
  }
}

async function finishTabSession(tabId) {
  const session = activeTabs[tabId];
  if (!session) return;

  const duration = Math.floor((Date.now() - session.startTime) / 1000);
  if (duration > 5) {
    await sendVisit({
      url: session.url,
      domain: session.domain,
      duration,
      timestamp: new Date(session.startTime).toISOString(),
      action: 'page_exit'
    });
  }
  delete activeTabs[tabId];
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    finishTabSession(tabId);
    if (isEducational(tab.url)) {
      activeTabs[tabId] = {
        url: tab.url,
        domain: new URL(tab.url).hostname,
        startTime: Date.now()
      };
      sendVisit({
        url: tab.url,
        domain: new URL(tab.url).hostname,
        duration: 0,
        timestamp: new Date().toISOString(),
        action: 'page_view'
      });
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  finishTabSession(tabId);
});

chrome.alarms.create('offlineSync', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'offlineSync') {
    const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
    if (!offlineQueue.length) return;
    const newQueue = [];
    for (const item of offlineQueue) {
      try {
        await fetch(`${API_BASE}/visits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      } catch {
        newQueue.push(item);
      }
    }
    chrome.storage.local.set({ offlineQueue: newQueue });
  }
});

// Запуск
init();
