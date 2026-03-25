/**
 * background.js — Manifest V3 Service Worker
 *
 * Owns a single persistent WebSocket connection to the sync-server.
 * Relays inbound server messages to any open popup via chrome.runtime.sendMessage.
 * Relays outbound popup "item_synced" requests to the server.
 */

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
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (typeof data.count === 'number') {
      currentCount = data.count;
      broadcastToPopup({ type: 'count', count: currentCount });
    }
  });

  socket.addEventListener('close', () => {
    broadcastToPopup({ type: 'status', connected: false });
    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  socket.addEventListener('error', () => {
    socket.close();
  });
}

function broadcastToPopup(payload) {
  chrome.runtime.sendMessage(payload).catch(() => {
    // Popup may not be open — silently ignore
  });
}

// ── Message handler ───────────────────────────────────────────────────────────
// Popup sends { action: "sync" } or { action: "getCount" }

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
