// Sync server — the central hub. Maintains a shared counter and broadcasts
// updates to all connected WebSocket clients (extension + web app).
//
// HTTP endpoints:
//   GET  /health  — readiness check (used by global-setup and CI)
//   POST /reset   — zeros the counter (used by test fixtures)
//
// WebSocket protocol (JSON):
//   Client → Server:  { "event": "item_synced" }  → increments counter
//   Server → Client:  { "count": N }              → broadcast on every change + on connect

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
let count = 0;

// ── HTTP ─────────────────────────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'ok', count }));
  }

  if (req.method === 'POST' && req.url === '/reset') {
    count = 0;
    broadcast({ count });
    res.writeHead(200);
    return res.end(JSON.stringify({ count }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ── WebSocket (shares the same port as HTTP) ─────────────────────────────────

const wss = new WebSocketServer({ server: httpServer });

// Sends a JSON payload to every connected client
function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(msg);
  }
}

wss.on('connection', (ws) => {
  // Send current state immediately so late joiners are caught up
  ws.send(JSON.stringify({ count }));

  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }
    if (data.event === 'item_synced') {
      count += 1;
      broadcast({ count });
    }
  });

  ws.on('error', (err) => console.error('[ws] client error:', err.message));
});

httpServer.listen(PORT, () => {
  console.log(`[sync-server] Listening on http://localhost:${PORT}`);
  console.log(`[sync-server] WebSocket ready at ws://localhost:${PORT}`);
});
