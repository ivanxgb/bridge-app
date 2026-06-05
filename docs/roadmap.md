# bridge-app — Roadmap

> Leyenda: `[ ]` pendiente, `[~]` en progreso, `[x]` completado  
> Cada fase incluye **entry criteria** (qué debe estar listo antes de empezar) y **exit criteria** (cómo verificar que la fase está completa).

---

## Fase 0 — Setup de entorno

**Entry:** repo existe, Go y Node no instalados aún  
**Exit:** `go build ./...` y `npx tsc --noEmit` pasan sin errores

- [x] Instalar Go 1.26+
- [x] `go mod init` + dependencias (chi, jwt, sqlite3, pty, websocket, crypto)
- [x] Scaffolding de paquetes Go (`cmd/`, `internal/{auth,db,model,tmux,api,server}`)
- [x] `npm create vite web/` con React + TypeScript
- [x] Instalar deps frontend: tailwind v4, tanstack router, tanstack query, xterm + addons
- [x] Configurar Vite proxy → `localhost:8080` para `/api`
- [x] Verificar compilación: `go build ./...` y `npx tsc --noEmit`

---

## Fase 1 — Backend core (auth + db)

**Entry:** Fase 0 completa. Código Go compila. Dependencias instaladas.  
**Exit:** `curl /api/auth/register → login → me` devuelve 200 con JSON válido y JWT funcional.  
**Status: ✅ COMPLETA**  
**Dependencias:** ninguna (es el primer eslabón del backend).

- [x] `internal/model/` — User, Session, Window, Pane structs
- [x] `internal/db/` — SQLite open, migrate, CRUD users
- [x] `internal/auth/` — JWT generate/parse, bcrypt hash/check, HTTP middleware
- [x] `internal/api/auth_handler.go` — register, login, refresh, me
- [x] `internal/api/router.go` — chi router con rutas públicas y protegidas
- [x] Test manual: `curl -X POST :8080/api/auth/register -d '{"username":"admin","password":"test"}'` → 200 + tokens
- [x] Test manual: `curl -H "Authorization: Bearer <token>" :8080/api/auth/me` → 200 + user JSON

---

## Fase 2 — tmux integration

**Entry:** Fase 1 completa. Auth funciona, JWT middleware activo en rutas protegidas.  
**Exit:** `curl /api/sessions` devuelve JSON con sesiones tmux reales. WebSocket streamea output de un pane existente con escape sequences ANSI.  
**Status: ✅ COMPLETA**

- [x] `internal/tmux/cli.go` — wrappers: list sessions/windows/panes, create, kill, rename, split
- [x] `internal/tmux/slave.go` — `TmuxControlSlave` con PTY + `tmux -C attach`
- [x] `internal/api/session_handler.go` — REST endpoints sessions/windows/panes
- [x] `internal/api/ws_handler.go` — WebSocket upgrade + bridge PTY↔WS
- [x] Test manual: `curl -H "Authorization: Bearer <token>" localhost:8080/api/sessions` → JSON con sesiones
- [x] Test manual: `curl -H "Authorization: Bearer <token>" localhost:8080/api/sessions/dev/windows/0/panes` → JSON con panes
- [x] Test manual: `curl -X POST -H "Authorization: Bearer <token>" -d '{"name":"test-session"}' localhost:8080/api/sessions` → 201
- [x] Test manual: `wscat -c "ws://localhost:8080/api/ws/session/demo?token=<jwt>"` → stream de terminal con escape sequences ANSI

---

## Fase 3 — Frontend auth & shell

**Entry:** Fase 1 completa (no necesita Fase 2). Backend auth endpoints funcionando.  
**Exit:** Login en el navegador → redirect a /sessions → sidebar renderiza. Logout limpia el estado.  
**Status: ✅ COMPLETA**  

- [x] `store/auth-context.tsx` — AuthProvider con JWT en sessionStorage
- [x] `components/auth/LoginForm.tsx` — formulario login con error state
- [x] `components/auth/ProtectedRoute.tsx` — redirect a /login si no hay token
- [x] `api/client.ts` — fetch wrapper con Authorization header + auto-refresh
- [x] `api/auth.ts` — login(), register(), me()
- [x] `router.tsx` — TanStack Router con route tree
- [x] `routes/__root.tsx`, `login.tsx`, `sessions.tsx` — shells de páginas
- [x] Test en browser: abrir / → redirect a /login → login → redirect a /sessions → sidebar renderiza (aunque vacía)
- [x] Test: token expira → 401 → auto-refresh → request retry exitoso

---

## Fase 4 — Frontend sesiones (dashboard)

**Entry:** Fase 2 completa (API de sesiones viva) + Fase 3 completa (auth en frontend funcional).  
**Exit:** Dashboard con sesiones reales, crear/matar/renombrar desde UI, navegación a detalle con ventanas y panes visibles.  
**Status: ✅ COMPLETA**  

- [x] `api/sessions.ts` — fetchSessions, createSession, killSession, fetchWindows, fetchPanes
- [x] `components/session/SessionList.tsx` — useQuery → lista con loading/empty/error/data
- [x] `components/session/CreateSessionButton.tsx` — modal con input name
- [x] `components/session/WindowTabs.tsx` — tabs horizontales
- [x] `components/session/PaneGrid.tsx` — grid responsivo de panes
- [x] Navegación: sidebar click → `/sessions/$id`
- [x] `routes/sessions_.$sessionId.tsx` — página de detalle
- [x] Test: sidebar muestra sesiones reales, click → detalle con ventanas y panes
- [x] Test: crear sesión nueva → aparece en sidebar sin recargar
- [x] Test: matar sesión → desaparece de la lista

---

## Fase 5 — Terminal (xterm.js + WebSocket)

**Entry:** Fase 2 completa (WS endpoint vivo) + Fase 4 completa (UI de panes renderiza).  
**Exit:** Cada pane de tmux tiene una terminal interactiva funcional. Escribir comandos, ver output en tiempo real, resize sincronizado.  
**Dependencias:** Fase 2 (necesita WebSocket `/api/ws/pane/...` transmitiendo) + Fase 4 (PaneGrid montado).

- [x] `hooks/useTmuxWebSocket.ts` — conectar a `/api/ws/pane/...`, enviar/recibir datos
- [x] `components/terminal/TerminalView.tsx` — xterm.js Terminal + addons (fit, webgl, web-links)
- [x] `TerminalView` — manejar resize, reconexión, cleanup al desmontar
- [x] Integrar TerminalView en PaneGrid → cada pane renderiza su terminal
- [ ] Test: abrir sesión, ver terminal con output real, escribir `ls` y ver respuesta
- [ ] Test: redimensionar navegador → terminal se ajusta → tmux pane se resizea

---

## Fase 6 — Mobile

**Entry:** Fase 4 completa (dashboard funcional) + Fase 5 completa (terminales vivas).  
**Exit:** La app es usable en celular. Toolbar táctil funcional, layout responsive en 3 breakpoints, sidebar drawer con swipe, touch targets grandes.  
**Dependencias:** Fase 4 + Fase 5 (necesita UI y terminal existentes para adaptarlos a mobile).

- [x] `components/terminal/MobileToolbar.tsx` — [Esc] [Tab] [Ctrl] [Alt] [C-b] [▲▼◀▶]
- [x] Toolbar: long-press sticky mode, swipe up → fila extendida con `/ : - Space Enter`
- [x] `hooks/useMobileDetect.ts` — detectar touch/mobile con media query + touch event check
- [x] Layout responsivo: sidebar drawer mobile, overlay tablet, fixed desktop
- [x] `components/layout/AppShell.tsx` — manejar 3 breakpoints (mobile <768, tablet 768-1023, desktop ≥1024)
- [x] `components/layout/Sidebar.tsx` — drawer + overlay en mobile, swipe open/close
- [x] `components/layout/TopBar.tsx` — user menu, hamburger button en mobile
- [x] Touch optimizations: `touch-action: none` en terminal, viewport meta, 300ms delay eliminado
- [ ] Test en celular real (o Chrome DevTools mobile mode): toolbar envía teclas a terminal
- [ ] Test: rotar pantalla → layout se adapta, terminal mantiene conexión

---

## Fase 7 — Pulido y deploy

**Entry:** Fases 1-6 completas. App funcional end-to-end.  
**Exit:** `./bin/bridge-server` corre en producción con HTTPS, systemd auto-restart, y backups.  
**Dependencias:** Fase 6 (todo el código existe, solo se pule y se empaqueta).

- [x] Error handling: tmux no disponible → mensaje claro en UI en vez de crash
- [x] Sesión inexistente → 404 manejado con toast
- [x] WebSocket disconnect → auto-reconnect con exponential backoff (1s, 2s, 4s, max 30s)
- [x] Tema oscuro consistente: xterm.js theme (#0d1117 bg, #58a6ff cursor) + UI CSS tokens
- [x] `cmd/bridge-server/main.go` — flags: `--port`, `--db`, `--jwt-secret`, `--static-dir`
- [x] `cmd/bridge-server/main.go` — graceful shutdown: SIGTERM → drain → close DB → exit
- [x] `--static-dir web/dist` → sirve el SPA build de Vite
- [x] `scripts/seed-user.sh` — wrapper bash que pide password y ejecuta el binario seed
- [x] `make build` → `go build -o bin/bridge-server` + `cd web && npm run build`
- [x] `make dev` → levanta backend en :8080 + frontend en :5173 con proxy
- [x] Test end-to-end: `make build && ./bin/bridge-server --jwt-secret=xxx --static-dir web/dist`
- [x] systemd unit file: `/etc/systemd/system/bridge-app.service`
- [x] HTTPS: Caddy reverse proxy config

---

## Backlog (post-MVP)

- [ ] `@tanstack/react-query` mutations con optimistic updates
- [ ] Auditoría: log de comandos ejecutados por usuario
- [ ] Rate limiting en API (chi middleware o token bucket)
- [ ] Session recording/replay con `tmux capture-pane -p -e -t`
- [ ] File upload/download via terminal (zmodem o paste)
- [ ] Soporte para múltiples VPS (conexiones SSH como backend alternativo)
- [ ] Temas customizables
- [ ] Atajos de teclado configurables en toolbar mobile
- [ ] Notificaciones: actividad en sesiones no visibles (badge en sidebar)
