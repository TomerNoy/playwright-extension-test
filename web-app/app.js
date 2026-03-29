// Web app — a second client that subscribes to the sync-server via WebSocket.
// Used as the "other surface" in tests to verify extension syncs propagate.

const WS_URL = 'ws://localhost:8080';
const RECONNECT_DELAY_MS = 2000;

const countEl = document.getElementById('sync-count');
const dotEl = document.getElementById('ws-dot');
const statusEl = document.getElementById('status-text');

function setConnected(connected) {
  dotEl.classList.toggle('connected', connected);
  statusEl.textContent = connected ? 'Connected to sync-server' : 'Disconnected — reconnecting…';
}

function setCount(n) {
  countEl.textContent = String(n);
  countEl.classList.remove('bump');
  void countEl.offsetWidth; // reflow to restart CSS animation
  countEl.classList.add('bump');
  setTimeout(() => countEl.classList.remove('bump'), 200);
}

function connect() {
  const ws = new WebSocket(WS_URL);
  ws.addEventListener('open', () => setConnected(true));
  ws.addEventListener('message', (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    if (typeof data.count === 'number') setCount(data.count);
  });
  ws.addEventListener('close', () => {
    setConnected(false);
    setTimeout(connect, RECONNECT_DELAY_MS);
  });
  ws.addEventListener('error', () => ws.close());
}

connect();
