# Tmux Bridge App — Plan de Implementación

## Objetivo

Webapp mobile-friendly que actúa como bridge entre una UI web y sesiones tmux en una VPS. Reemplaza Termius con scroll fluido, gestión de sesiones multitáctil, y soporte multi-usuario con autenticación.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Go (reusa `webtty` de GoTTY para el bridge PTY↔WebSocket) |
| Frontend | React + TanStack Router + TanStack Query + Tailwind CSS + xterm.js |
| Base de datos | SQLite (solo usuarios, las sesiones tmux son efímeras) |
| Autenticación | JWT + bcrypt |
| Transporte terminal | WebSocket + tmux control mode (`tmux -C attach`) |

---

## Estructura del proyecto

```
/opt/bridge-app/
├── Makefile
├── go.mod / go.sum
├── .gitignore
│
├── cmd/bridge-server/main.go          # Entrypoint
│
├── internal/
│   ├── auth/
│   │   ├── jwt.go                      # Token generation & validation
│   │   ├── middleware.go               # JWT bearer middleware
│   │   └── password.go                 # bcrypt
│   ├── db/
│   │   ├── sqlite.go                   # Open DB, migrations
│   │   ├── users.go                    # CRUD users
│   │   └── migrations.go              # DDL embebido
│   ├── model/
│   │   ├── user.go                     # User struct
│   │   └── tmux.go                     # Session, Window, Pane structs
│   ├── tmux/
│   │   ├── cli.go                      # Wrappers de comandos tmux
│   │   ├── parser.go                   # Parse de output tmux → structs
│   │   ├── control.go                  # Gestión de tmux -C per pane
│   │   └── slave.go                    # Implementación de webtty.Slave
│   ├── api/
│   │   ├── router.go                   # chi router, monta REST + WS
│   │   ├── auth_handler.go             # /api/auth/*
│   │   ├── session_handler.go          # /api/sessions/*
│   │   └── ws_handler.go               # /api/ws/pane/*
│   └── server/server.go                # HTTP server, graceful shutdown
│
├── web/
│   ├── package.json, tsconfig.json, vite.config.ts
│   ├── tailwind.config.ts, postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx                    # Root: providers
│       ├── router.tsx                  # TanStack Router: route tree
│       ├── globals.css                 # Tailwind + mobile styles
│       ├── api/
│       │   ├── client.ts              # fetch wrapper, JWT injection
│       │   ├── auth.ts                # login, register, me, refresh
│       │   └── sessions.ts           # REST calls tmux
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useTmuxWebSocket.ts    # WS lifecycle per pane
│       │   └── useMobileDetect.ts
│       ├── store/auth-context.tsx      # AuthContext (user, token)
│       ├── components/
│       │   ├── layout/                 # AppShell, TopBar, Sidebar
│       │   ├── session/                # SessionCard, WindowTabs, PaneGrid
│       │   ├── terminal/               # TerminalView, TerminalTabs, MobileToolbar
│       │   ├── auth/                   # LoginForm, ProtectedRoute
│       │   └── ui/                     # Button, Input, Modal, Spinner
│       └── routes/
│           ├── __root.tsx              # Auth guard + AppShell
│           ├── index.tsx               # → redirect /sessions
│           ├── login.tsx
│           ├── sessions.tsx            # Dashboard: lista sesiones
│           └── sessions_.$sessionId.tsx # Detalle sesión + terminales
│
└── scripts/
    ├── install-go.sh                   # Instalación de Go
    └── seed-user.sh                    # Crear primer usuario admin
```

---

## Data Models

### User (SQLite)

```sql
CREATE TABLE users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,                     -- bcrypt
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Session / Window / Pane (efímeros, desde tmux CLI)

```go
type Session struct {
    ID, Name        string
    Windows         int
    Created         string
    Attached        bool
}
type Window struct {
    ID, Name        string
    Active          bool
    Panes           []Pane
}
type Pane struct {
    ID, Title       string
    Active          bool
    PID             string
}
```

Se parsean con formato machine-readable:

```bash
tmux list-sessions -F "#{session_id}\t#{session_name}\t#{session_windows}\t#{session_created}\t#{session_attached}"
tmux list-windows -t "$session" -F "#{window_index}\t#{window_name}\t#{window_active}"
tmux list-panes -t "$session:$window" -F "#{pane_index}\t#{pane_title}\t#{pane_active}\t#{pane_pid}"
```

---

## API Endpoints

### REST

| Method | Path | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | No | Crear usuario |
| `POST` | `/api/auth/login` | No | Login → JWT |
| `POST` | `/api/auth/refresh` | No | Refresh token |
| `GET` | `/api/auth/me` | JWT | Info usuario actual |
| `GET` | `/api/sessions` | JWT | Listar sesiones tmux |
| `POST` | `/api/sessions` | JWT | Crear sesión `{name, cmd?}` |
| `DELETE` | `/api/sessions/:id` | JWT | Matar sesión |
| `POST` | `/api/sessions/:id/rename` | JWT | Renombrar `{new_name}` |
| `GET` | `/api/sessions/:id/windows` | JWT | Listar ventanas |
| `POST` | `/api/sessions/:id/windows` | JWT | Crear ventana `{name?, cmd?}` |
| `DELETE` | `/api/sessions/:id/windows/:win` | JWT | Matar ventana |
| `GET` | `/api/sessions/:id/windows/:win/panes` | JWT | Listar panes |
| `POST` | `/api/sessions/:id/windows/:win/panes` | JWT | Split pane `{horizontal?, cmd?}` |
| `DELETE` | `/api/sessions/:id/windows/:win/panes/:pane` | JWT | Matar pane |

### WebSocket

| Path | Auth | Descripción |
|------|------|-------------|
| `GET /api/ws/pane/:sessionId/:windowId/:paneId?token=jwt` | JWT query param | Bridge xterm.js ↔ tmux -C |

### Static files

`/*` → sirve `web/dist/` (SPA catch-all)

---

## tmux Control Mode — Pieza central

### Flujo

```
Browser xterm.js  ←WebSocket→  Go server  ←PTY (stdin/stdout)→  tmux -C attach -t sess:win.pane
```

### Slave.go — Implementación de `webtty.Slave`

```go
// internal/tmux/slave.go
type TmuxControlSlave struct {
    cmd  *exec.Cmd
    ptmx *os.File  // PTY master — leemos/escribimos por acá
}

func NewTmuxControlSlave(sessionID, windowID, paneID string) (*TmuxControlSlave, error) {
    // 1. Crear PTY pair
    ptmx, pts, _ := pty.Open()
    // 2. Spawnear tmux en control mode
    target := fmt.Sprintf("%s:%s.%s", sessionID, windowID, paneID)
    cmd := exec.Command("tmux", "-C", "attach", "-t", target)
    cmd.Stdin = pts
    cmd.Stdout = pts
    cmd.Stderr = os.Stderr
    cmd.Start()
    return &TmuxControlSlave{cmd: cmd, ptmx: ptmx}, nil
}

func (s *TmuxControlSlave) Read(p []byte) (int, error)  { return s.ptmx.Read(p) }
func (s *TmuxControlSlave) Write(p []byte) (int, error) { return s.ptmx.Write(p) }
func (s *TmuxControlSlave) Close() error {
    s.ptmx.Close()
    return s.cmd.Wait()
}
func (s *TmuxControlSlave) ResizeTerminal(cols, rows int) error {
    return termios.SetWinsize(s.ptmx.Fd(), &termios.Winsize{Width: uint16(cols), Height: uint16(rows)})
}
```

### Por qué PTY en vez de pipe directo

`webtty` necesita `ResizeTerminal` para enviar `SIGWINCH` — tmux ajusta el layout del pane cuando recibe esa señal. Un pipe directo no lo soporta.

### Ciclo de vida

1. Cliente abre WebSocket → server valida JWT
2. Server spawn `tmux -C attach` via PTY
3. `webtty.Run(slave, wsConn)` → goroutines de read/write
4. WebSocket cierra → `slave.Close()` → mata el proceso `tmux -C` (la sesión/pane sigue vivo, solo se desadjunta)

---

## Frontend: Component Tree & Rutas

### TanStack Router

```
/                 → redirect /sessions
/login            → LoginForm (sin chrome)
/sessions         → SessionsListPage (dashboard)
/sessions/$id     → SessionDetailPage (terminales)
```

### Jerarquía de componentes

```
<QueryClientProvider>
  <AuthProvider>
    <RouterProvider>
      <RootLayout>                          // auth guard + AppShell
        <TopBar><UserMenu /></TopBar>
        <Sidebar>
          <SessionList />                   // TanStack Query: useQuery sessions
          <CreateSessionButton />
        </Sidebar>
        <main><Outlet /></main>             // contenido de ruta hija
      </RootLayout>
      {/* /sessions → SessionsListPage */}
      {/* /sessions/$id → SessionDetailPage */}
        <WindowTabs windows={...}>
          <PaneGrid panes={...}>
            <TerminalView pane={p} />       // xterm.js + WebSocket
          </PaneGrid>
        </WindowTabs>
        <MobileToolbar />                   // fixed bottom bar en mobile
    </RouterProvider>
  </AuthProvider>
</QueryClientProvider>
```

---

## State Management

| Qué | Con qué |
|-----|---------|
| Auth (user, token) | React Context (`AuthContext`) |
| Lista de sesiones | TanStack Query `useQuery` + refetchInterval 5s |
| Ventanas de sesión | TanStack Query `useQuery` keyed by sessionId |
| Panes de ventana | TanStack Query `useQuery` keyed by sessionId+windowId |
| WebSocket xterm | `useRef` dentro de `useTmuxWebSocket` hook |
| Toolbar mobile | `useState` + `useMobileDetect` |
| Sidebar open/closed | `useState` + cookie |

---

## Autenticación

```
POST /api/auth/login → bcrypt.Compare → JWT (access 15min, refresh 7d)
  ↓
Frontend: AuthContext guarda tokens en memoria (no localStorage)
  ↓
API client inyecta Authorization: Bearer <token>
  ↓
401 → POST /api/auth/refresh → retry
  ↓
WebSocket: new WebSocket("ws://host/api/ws/pane/...?token=" + jwt)
```

---

## Mobile UI

### MobileToolbar (fija abajo, solo en touch < 768px)

```
[Esc] [Tab] [Ctrl] [Alt] [C-b] [▲] [▼] [◀] [▶]
```

- Cada botón envía secuencia de escape a xterm.js
- Long-press en Ctrl/Alt → sticky mode
- Swipe up en toolbar → fila extendida con `/`, `:`, `-`, `Space`

### xterm.js config para mobile

```
fontSize: 13, cursorBlink: true, cursorStyle: 'bar'
Addons: FitAddon, WebglAddon, WebLinksAddon
```

### Layout responsivo

| ≥ 1024px | Sidebar 280px + main |
| 768-1023px | Sidebar overlay colapsable |
| < 768px | Full-screen terminal, sidebar drawer, toolbar fixed bottom |

---

## Backend: Dependencias Go (go.mod)

```
github.com/golang-jwt/jwt/v5
github.com/mattn/go-sqlite3
github.com/creack/pty
golang.org/x/crypto
golang.org/x/term
github.com/gorilla/websocket
github.com/go-chi/chi/v5
github.com/yudai/gotty/webtty
```

---

## Orden de Implementación

### Fase 0 — Setup
1. Instalar Go 1.22+ (`scripts/install-go.sh`)
2. `go mod init bridge-app`
3. `npm create vite@latest web/` (React + TypeScript)
4. Instalar deps frontend: tailwind, tanstack router/query, xterm + addons
5. Configurar Vite proxy → `localhost:8080` para `/api`

### Fase 1 — Backend Core
1. `internal/model/` — structs
2. `internal/db/` — SQLite, users, migrations
3. `internal/auth/` — JWT, bcrypt, middleware
4. `internal/api/auth_handler.go` + `router.go`
5. `cmd/bridge-server/main.go` mínimo
6. Test con curl: register → login → me

### Fase 2 — tmux Integration
1. `internal/tmux/parser.go` — parse `tmux list-*`
2. `internal/tmux/cli.go` — wrappers
3. `internal/tmux/slave.go` — webtty.Slave
4. `internal/api/session_handler.go` — REST sessions
5. `internal/api/ws_handler.go` — WebSocket bridge
6. Test con `wscat` conectado a un pane

### Fase 3 — Frontend Auth & Shell
1. AuthContext, LoginForm, ProtectedRoute
2. API client con JWT injection
3. AppShell layout, TopBar, Sidebar skeleton
4. TanStack Router config con rutas
5. Probar login → dashboard vacío

### Fase 4 — Frontend Sesiones
1. `api/sessions.ts` — fetch wrapper
2. SessionList con TanStack Query
3. SessionCard, CreateSessionButton
4. WindowTabs, PaneGrid
5. Navegación: sidebar click → /sessions/$id

### Fase 5 — Terminal
1. `useTmuxWebSocket` hook
2. TerminalView con xterm.js + addons
3. Conexión WS, resize handling
4. Múltiples panes visibles simultáneos

### Fase 6 — Mobile
1. MobileToolbar component
2. `useMobileDetect` hook
3. Responsive layout (drawer, fullscreen terminal)
4. Touch optimizations (300ms delay, touch-action, viewport meta)
5. Toolbar sticky keys, long-press

### Fase 7 — Pulido
1. Error handling (tmux no disponible, sesión inexistente)
2. Reconnect automático del WebSocket
3. Tema oscuro forzado
4. seed-user.sh script

---

## Verificación

- `curl -X POST localhost:8080/api/auth/login -d '{"username":"admin","password":"..."}'` → JWT
- `curl -H "Authorization: Bearer $JWT" localhost:8080/api/sessions` → JSON con sesiones tmux
- `wscat -c "ws://localhost:8080/api/ws/pane/dev/@0/%0?token=$JWT"` → stream de terminal
- Frontend: login → ver sesiones → click → ver terminal funcionando
- Mobile: toolbar funcional, resize al rotar, scroll táctil fluido
