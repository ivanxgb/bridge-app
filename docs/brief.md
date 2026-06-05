# bridge-app — Agent Brief

## What is this?

A mobile-first webapp that replaces Termius. Connect to your tmux sessions from a browser with a touch-friendly UI. Currently running on a Linux VPS with tmux 3.3a managing multiple sessions.

**Core loop:** Login → sidebar shows tmux sessions → click one → see live terminals with xterm.js → mobile toolbar for missing keys (Ctrl, Alt, Esc, tmux prefix).

---

## Current state (May 2026)

### ✅ Done — Backend (Fases 0-2)

- **Go server** at `cmd/bridge-server/main.go`, compiles with `go build -o bin/bridge-server`
- **Start:** `BRIDGE_JWT_SECRET=xxx ./bin/bridge-server --port 8080 --db bridge.db --jwt-secret xxx`
- **Auth:** JWT + bcrypt. Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/refresh`
- **tmux:** `GET /api/sessions` (list), `POST /api/sessions` (create), `DELETE /api/sessions/:id`, `POST /api/sessions/:id/rename`, `GET /api/sessions/:id/windows`, `GET /api/sessions/:id/windows/:win/panes`
- **WebSocket:** `GET /api/ws/pane/:sessionId/:windowId/:paneId?token=jwt` — streams real terminal output via tmux control mode
- **Seed user:** `go run ./scripts/seed/main.go --db bridge.db --user admin --pass test123`
- All endpoints tested with curl and wscat — working against real tmux sessions (vb-bridge, vf-cmd, vf-codex)

### ⏳ Code ready, not tested — Frontend auth (Fase 3)

- `web/src/store/auth-context.tsx` — AuthProvider with JWT in sessionStorage
- `web/src/components/auth/LoginForm.tsx` — username + password form
- `web/src/components/auth/ProtectedRoute.tsx` — redirect to /login
- `web/src/api/client.ts` — fetch wrapper with Bearer token + auto-refresh
- `web/src/api/auth.ts` — login(), register(), me()
- `web/src/router.tsx` — TanStack Router: `/login`, `/sessions`
- Routes created as shells, not functional yet

### ❌ TODO — Fase 4: Dashboard UI

- `web/src/api/sessions.ts` — already has typed fetch functions (`fetchSessions`, `createSession`, `killSession`, `fetchWindows`, `fetchPanes`)
- Need to build: SessionList, SessionCard, CreateSessionButton, WindowTabs, PaneGrid
- `web/src/routes/sessions_.$sessionId.tsx` — session detail page (not created yet)

### ❌ TODO — Fase 5: Terminal

- `web/src/hooks/useTmuxWebSocket.ts` — already coded, connects to WS, handles send/resize/onData
- Need: TerminalView component wrapping xterm.js + addons (already installed)

### ❌ TODO — Fase 6: Mobile

- MobileToolbar, responsive layout, sidebar drawer, touch optimizations

---

## What to build next — Fase 4 Dashboard

**Goal:** A working session dashboard that shows real tmux sessions from the API.

**Entry condition:** Backend running on :8080 with seeded user (admin/test123). API endpoints returning real data.

**Exit condition:** User logs in, sees tmux sessions in sidebar, clicks one to navigate to session detail showing windows and panes. Can create, rename, and kill sessions from the UI.

### Files to create/modify

| File | Action | Purpose |
|------|--------|---------|
| `web/src/api/sessions.ts` | ✅ exists | Already typed — fetchSessions, createSession, killSession, etc. |
| `web/src/components/session/SessionList.tsx` | CREATE | useQuery → render list with loading/empty/error/data states |
| `web/src/components/session/SessionCard.tsx` | CREATE | Expandable card: session name, window count, attached indicator. Click → navigate to /sessions/$id |
| `web/src/components/session/CreateSessionButton.tsx` | CREATE | Button → modal with name input → POST /api/sessions → invalidate query |
| `web/src/components/session/WindowTabs.tsx` | CREATE | Horizontal tabs for switching windows within a session |
| `web/src/components/session/PaneGrid.tsx` | CREATE | Responsive grid of panes for a window |
| `web/src/routes/sessions.tsx` | MODIFY | Wire SessionList in sidebar, handle navigation |
| `web/src/routes/sessions_.$sessionId.tsx` | CREATE | Session detail: WindowTabs + PaneGrid |

### API reference

All endpoints require `Authorization: Bearer <jwt>` header.

```typescript
// Session list
GET /api/sessions
→ [{ id: "$0", name: "vf-codex", windows: 1, created: "1779820289", attached: true }, ...]

// Create session
POST /api/sessions  body: { name: "my-session" }
→ 201 Created

// Kill session
DELETE /api/sessions/$0
→ 204 No Content

// Rename session
POST /api/sessions/$0/rename  body: { new_name: "new-name" }
→ 204 No Content

// Windows for a session
GET /api/sessions/vf-codex/windows
→ [{ id: "0", name: "bash", active: true }, ...]

// Panes for a window
GET /api/sessions/vf-codex/windows/0/panes
→ [{ id: "0", title: "bash", active: true, pid: "12345" }]
```

**Important:** Session IDs from tmux use `$` prefix (e.g., `$0`, `$1`). Window IDs are plain integers (e.g., `0`, `1`). Pane IDs are plain integers (e.g., `0`, `1`). The ID used in API paths is the `name` field (e.g., "vf-codex"), not the `id` field (e.g., "$0").

### Frontend stack

- React 19 + TypeScript + Tailwind CSS v4
- TanStack Router (type-safe routing)
- TanStack Query (data fetching + caching)
- @xterm/xterm + addons (fit, webgl, web-links) — already installed, not wired yet
- Vite dev server on :5173 with proxy to :8080 for /api

### How to develop

```bash
cd /opt/bridge-app
# Terminal 1: start backend
export BRIDGE_JWT_SECRET="$(openssl rand -hex 32)"
./bin/bridge-server --port 8080 --db bridge.db --jwt-secret "$BRIDGE_JWT_SECRET"

# Terminal 2: seed user (once)
go run ./scripts/seed/main.go --db bridge.db --user admin --pass test123

# Terminal 3: start frontend
cd web && npm run dev
# Opens on :5173, /api proxied to :8080
```

### Design system basics

Dark mode only. Colors are GitHub dark palette defined in `web/src/globals.css`:
- `--bg-primary: #0d1117` (background)
- `--bg-secondary: #161b22` (cards, sidebar)
- `--border: #30363d`
- `--text-primary: #c9d1d9`
- `--accent: #58a6ff`
- `--success: #3fb950`
- `--danger: #f85149`

Base components already exist: `Button.tsx` (primary/danger/ghost variants), `Spinner.tsx`.

### Component states

Every data-loading component must handle: **loading** (spinner/skeleton), **empty** (helpful message + CTA), **error** (message + retry), **data** (render normally).

---

## Key URLs

- **Plan:** https://ivanxgb.github.io/bridge-app/
- **Roadmap (live progress):** https://ivanxgb.github.io/bridge-app/roadmap.html
- **Design vision:** `docs/vision.md`
- **Repo:** https://github.com/ivanxgb/bridge-app
