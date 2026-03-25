# Playwright Extension Test

A browser automation sandbox that validates how data moves between a **Chrome Extension** and a **Web App** in real time via Playwright.

```
Chrome Extension (Playwright) ──┐
                                 ├──► Node.js WebSocket Server
Web App (Playwright assert)  ───┘
```

---

## What this demonstrates

| Concern | Tool |
|---|---|
| Browser extension automation | Playwright + Chromium |
| Real-time WebSocket sync validation | Custom Node.js `ws` server |
| AI-assisted locator authoring | `cursor-ide-browser` MCP |
| Continuous integration | GitHub Actions (`ubuntu-latest`) |

---

## Project structure

```
playwright-extension-test/
├── sync-server/          # Node.js WebSocket broadcast server
├── chrome-extension/     # Manifest V3 extension (plain JS, no build)
├── web-app/              # Static HTML + JS subscriber
├── tests/
│   └── playwright/       # Browser E2E suite
├── .github/workflows/    # CI pipeline
├── PLAN.md               # Architecture & implementation plan
└── README.md
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20+ |
| npm | 10+ |

---

## Setup

```bash
git clone <repo-url> playwright-extension-test
cd playwright-extension-test
npm install
```

---

## Running the sync-server

```bash
node sync-server/server.js
# Listening on http://localhost:8080
# WebSocket ready at ws://localhost:8080
```

Health check: `GET http://localhost:8080/health` → `{ status: "ok", count: N }`
Reset counter: `POST http://localhost:8080/reset` → `{ count: 0 }`

---

## Loading the Chrome Extension manually

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. Click the extension icon in the toolbar to open the popup

---

## Running the Web App

```bash
cd web-app && npx serve . -p 3000
# Open http://localhost:3000
```

---

## Running Tests (Playwright)

```bash
cd tests/playwright
npm install
npx playwright install chromium

# Run all tests (global-setup starts sync-server and web-app automatically)
npx playwright test

# Run in headed mode (watch the browser)
npx playwright test --headed

# Open the HTML report after a run
npx playwright show-report
```

**What the tests do:**

1. `global-setup.js` spawns `sync-server` and `serve` for the web-app
2. `fixtures.js` resets the server counter, then launches Chromium with the extension loaded via `launchPersistentContext`
3. Tests open the extension popup via `chrome-extension://<id>/popup.html`
4. Tests click **Sync Item** and assert both the popup and the web app update

---

## AI-Assisted Locator Authoring (MCP)

While the web-app or extension popup is open in Cursor's browser, use:

```
browser_snapshot    → captures live DOM tree
browser_navigate    → opens a URL
```

**Workflow:**
1. Start sync-server + web-app
2. Ask Cursor: *"Take a snapshot of http://localhost:3000 and write a Playwright selector for the sync count element"*
3. Cursor navigates, snapshots, and outputs the selector

---

## CI Pipeline

The browser test suite runs automatically on every push and pull request via GitHub Actions.

| Pipeline | File | Platform | Trigger |
|---|---|---|---|
| Browser (Playwright) | `.github/workflows/test-browser.yml` | `ubuntu-latest` | push / PR |

Artifacts uploaded on every run:
- `playwright-report/` — full HTML test report
- `test-results/` — screenshots and videos on failure

---

## Sync Protocol

All messages are JSON over WebSocket (`ws://localhost:8080`).

| Direction | Payload | Meaning |
|---|---|---|
| Client → Server | `{ "event": "item_synced" }` | Increment the counter |
| Server → Client | `{ "count": N }` | Broadcast new state to all subscribers |
| Server → Client (on connect) | `{ "count": N }` | Current state snapshot |
