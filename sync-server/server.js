/**
 * Playwright Extension Test — WebSocket sync server
 *
 * State: a single shared counter (count).
 * Protocol:
 *   Client → Server: { event: "item_synced" }
 *   Server → All:   { count: <number> }
 *   Server → Client (on connect): { count: <number> }  (current state snapshot)
 *
 * HTTP GET /health → 200 { status: "ok", count }  (used by CI readiness checks)
 * HTTP POST /reset  → 200 { count: 0 }             (used by test teardown)
 */

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;

let count = 0;

// ── HTTP server ──────────────────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', count }));
    return;
  }

  if (req.method === 'POST' && req.url === '/reset') {
    count = 0;
    broadcast({ count });
    res.writeHead(200);
    res.end(JSON.stringify({ count }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ── WebSocket server ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server: httpServer });

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  // Send current state to the newly connected client
  ws.send(JSON.stringify({ count }));

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (data.event === 'item_synced') {
      count += 1;
      broadcast({ count });
    }
  });

  ws.on('error', (err) => {
    console.error('[ws] client error:', err.message);
  });
});

// ── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[sync-server] Listening on http://localhost:${PORT}`);
  console.log(`[sync-server] WebSocket ready at ws://localhost:${PORT}`);
});
