
const API_BASE = 'http://83.242.96.175:5002/api';

const DEFAULT_SITES = [
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
].map(domain => ({ domain, url_pattern: '' }));

let educationalSites = [...DEFAULT_SITES]; 
let activeTabs = {};

async function initialize() {
  const result = await chrome.storage.local.get(['apiUrl', 'token', 'educationalSites']);
  if (result.apiUrl) API_BASE = result.apiUrl;
  
  if (result.educationalSites && Array.isArray(result.educationalSites)) {
    const existingDomains = new Set(DEFAULT_SITES.map(s => s.domain));
    const merged = [...DEFAULT_SITES];
    for (const site of result.educationalSites) {
      if (!existingDomains.has(site.domain)) {
        merged.push(site);
        existingDomains.add(site.domain);
      }
    }
    educationalSites = merged;
  } else {
    educationalSites = [...DEFAULT_SITES];
  }
  if (result.token) {
    await fetchEducationalSites(result.token);
  }
  
  checkExistingTabs();
}

initialize();

async function fetchEducationalSites(token) {
  try {
    const response = await fetch(`${API_BASE}/sites`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const serverSites = await response.json();
      const existingDomains = new Set(educationalSites.map(s => s.domain));
      const merged = [...educationalSites];
      for (const site of serverSites) {
        if (!existingDomains.has(site.domain)) {
          merged.push(site);
          existingDomains.add(site.domain);
        }
      }
      educationalSites = merged;
      await chrome.storage.local.set({ educationalSites });
    }
  } catch (error) {
    console.error('Ошибка загрузки образовательных сайтов:', error);
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
      sendVisit({
        url: tab.url,
        domain: new URL(tab.url).hostname,
        duration: 0,
        timestamp: new Date().toISOString(),
        action: 'page_view'
      });
    }
  }
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
  const { token, trackingEnabled } = await chrome.storage.local.get(['token', 'trackingEnabled']);
  if (!token || !trackingEnabled) return;

  try {
    await fetch(`${API_BASE}/visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Ошибка отправки данных:', error);
    const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
    offlineQueue.push(data);
    chrome.storage.local.set({ offlineQueue });
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
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'offlineSync') {
    processOfflineQueue();
  }
});

async function processOfflineQueue() {
  const { offlineQueue = [], token } = await chrome.storage.local.get(['offlineQueue', 'token']);
  if (!offlineQueue.length || !token) return;

  const newQueue = [];
  for (const item of offlineQueue) {
    try {
      await fetch(`${API_BASE}/visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(item)
      });
    } catch {
      newQueue.push(item); 
    }
  }
  chrome.storage.local.set({ offlineQueue: newQueue });
}
