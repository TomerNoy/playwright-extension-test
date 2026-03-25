/**
 * popup.js — Extension popup UI controller
 *
 * On load: asks the background service worker for the current count.
 * Listens for real-time count updates pushed from the background.
 * On button click: tells the background to emit "item_synced".
 */

const countEl = document.getElementById('sync-count');
const syncBtn = document.getElementById('sync-btn');
const statusEl = document.getElementById('ws-status');

function setCount(n) {
  countEl.textContent = String(n);
}

function setStatus(connected) {
  statusEl.textContent = connected ? 'Connected' : 'Disconnected';
  statusEl.className = `status ${connected ? 'connected' : 'disconnected'}`;
}

// Fetch initial state from background
chrome.runtime.sendMessage({ action: 'getCount' }, (response) => {
  if (response) setCount(response.count);
});

// Listen for pushed updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'count') {
    setCount(message.count);
  }
  if (message.type === 'status') {
    setStatus(message.connected);
  }
});

// Sync button
syncBtn.addEventListener('click', () => {
  syncBtn.disabled = true;
  chrome.runtime.sendMessage({ action: 'sync' }, () => {
    syncBtn.disabled = false;
  });
});
