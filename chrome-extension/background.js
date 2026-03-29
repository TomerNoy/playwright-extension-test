// Service worker (MV3) — the extension's background process.
// Maintains a WebSocket to the sync-server, relays messages between
// the server and the popup UI via chrome.runtime messaging.

const WS_URL = 'ws://localhost:8080';
const RECONNECT_DELAY_MS = 2000;

let socket = null;
let currentCount = 0;

function connect() {
  socket = new WebSocket(WS_URL);

  socket.addEventListener('open', () => {
    broadcastToPopup({ type: 'status', connected: true });
  });

  socket.addEventListener('message', (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    if (typeof data.count === 'number') {
      currentCount = data.count;
      broadcastToPopup({ type: 'count', count: currentCount });
    }
  });

  socket.addEventListener('close', () => {
    broadcastToPopup({ type: 'status', connected: false });
    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  socket.addEventListener('error', () => socket.close());
}

// Pushes data to the popup (silently ignored if popup is closed)
function broadcastToPopup(payload) {
  chrome.runtime.sendMessage(payload).catch(() => {});
}

// Handles messages from the popup:
//   { action: "getCount" } → returns current count
//   { action: "sync" }     → sends item_synced to the server
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getCount') {
    sendResponse({ count: currentCount });
    return true;
  }
  if (message.action === 'sync') {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event: 'item_synced' }));
    }
    sendResponse({ ok: true });
    return true;
  }
});

connect();
