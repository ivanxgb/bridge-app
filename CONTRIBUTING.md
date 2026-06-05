# Contributing

Thanks for helping improve bridge-app. The project is early, but it aims to be a
practical self-hosted devtool that maintainers can inspect, run, and harden.

## Good First Areas

- Improve setup docs for different Linux/macOS environments.
- Add focused tests for auth, session parsing, and WebSocket behavior.
- Improve mobile terminal ergonomics.
- Harden deployment examples and reverse-proxy guidance.
- Add screenshots, short demos, and troubleshooting notes.

## Local Development

Requirements:

- Go 1.26+
- Node.js 25+
- npm
- tmux

```bash
git clone https://github.com/ivanxgb/bridge-app.git
cd bridge-app

cd web && npm install && cd ..

export BRIDGE_JWT_SECRET="$(openssl rand -hex 32)"
export BRIDGE_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
make dev
```

For a production-like single binary build:

```bash
make build
BRIDGE_JWT_SECRET="$(openssl rand -hex 32)" make run
```

## Before Opening a Pull Request

Run the checks that apply to your change:

```bash
gofmt -w ./cmd ./internal ./scripts
go test ./...

cd web
npm ci
npm run build
```

If you cannot run a check locally, mention that in the PR.

## Security-Sensitive Changes

bridge-app exposes terminal sessions through a browser, so security-sensitive
changes need extra care. Please call out changes that touch:

- authentication, cookies, JWTs, or refresh behavior
- WebSocket origin checks or token transport
- tmux target parsing, command execution, and process lifecycle
- reverse proxy, systemd, TLS, or secret handling
- logs that could expose tokens, commands, paths, or usernames

Use [SECURITY.md](./SECURITY.md) for private vulnerability reports.
