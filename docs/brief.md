# bridge-app — Maintainer Brief

This file is a compact status snapshot for contributors. The user-facing
overview lives in [README.md](../README.md).

## What Works Today

- Go backend entrypoint at `cmd/bridge-server/main.go`.
- SQLite user store with bcrypt password hashes.
- Cookie-based JWT login, refresh, logout, and `/api/auth/me`.
- tmux session/window/pane REST endpoints.
- Authenticated WebSocket terminal bridge using xterm.js on the client.
- React frontend with session dashboard, chat views, terminal view, and mobile
  toolbar.
- Production-style static serving through `--static-dir web/dist`.
- CI for Go formatting/tests/build and frontend install/build.

## Current Hardening Focus

- Add login throttling and request rate limiting.
- Expand tests around auth, tmux parser behavior, and API edge cases.
- Add audit logs for session and command actions.
- Document reverse-proxy limits and supported deployment shapes.
- Add screenshots and a short demo walkthrough to the README.

## Useful Commands

```bash
export BRIDGE_JWT_SECRET="$(openssl rand -hex 32)"
export BRIDGE_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"

cd web && npm install && cd ..
make dev
```

```bash
go test ./...
go build -o bin/bridge-server ./cmd/bridge-server

cd web
npm ci
npm run build
```

## Notes

The project is an MVP, but it should remain honest and runnable. Avoid committing
private hostnames, local usernames, real secrets, generated databases, or demo
credentials.
