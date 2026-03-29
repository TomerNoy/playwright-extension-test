// Popup UI controller — the panel shown when you click the extension icon.
// Communicates with background.js via chrome.runtime messaging (no direct
// WebSocket access from the popup).

const countEl = document.getElementById('sync-count');
const syncBtn = document.getElementById('sync-btn');
const statusEl = document.getElementById('ws-status');

function setCount(n) { countEl.textContent = String(n); }

function setStatus(connected) {
  statusEl.textContent = connected ? 'Connected' : 'Disconnected';
  statusEl.className = `status ${connected ? 'connected' : 'disconnected'}`;
}

// Ask background for current count on load
chrome.runtime.sendMessage({ action: 'getCount' }, (response) => {
  if (response) setCount(response.count);
});

// Listen for real-time updates pushed from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'count') setCount(message.count);
  if (message.type === 'status') setStatus(message.connected);
});

// Sync button — tells background to send item_synced to the server
syncBtn.addEventListener('click', () => {
  syncBtn.disabled = true;
  chrome.runtime.sendMessage({ action: 'sync' }, () => {
    syncBtn.disabled = false;
  });
});
