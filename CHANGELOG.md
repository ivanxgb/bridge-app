# Changelog

All notable changes to bridge-app will be documented here.

## v0.1.0 - Public MVP

- Added the Go server for auth, SQLite users, tmux session APIs, and WebSocket
  terminal streaming.
- Added the React/xterm.js frontend for session browsing and mobile-friendly
  terminal access.
- Added deployment examples for systemd, nginx, and Caddy.
- Added MIT licensing, security policy, public README, roadmap, and `.env`
  examples.

## Unreleased

- Fix `/api/auth/refresh` so cookie-based sessions can refresh without a JSON
  body, matching the frontend client behavior.
- Add focused Go tests for auth refresh, WebSocket origin checks, and tmux output
  parsing.
- Refresh the maintainer brief docs and remove stale demo credentials/session
  names from public docs.
- Harden WebSocket origin checks with same-origin defaults and configurable
  `BRIDGE_ALLOWED_ORIGINS`.
- Add GitHub Actions CI for backend and frontend builds.
- Add contribution guide, pull request template, and issue templates.
