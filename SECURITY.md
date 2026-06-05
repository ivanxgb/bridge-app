# Security Policy

`bridge-app` exposes local shell sessions through a browser. Treat it with the
same care as SSH.

## Secrets

Never commit:

- `.env`
- SQLite databases (`*.db`, `*.db-wal`, `*.db-shm`)
- `BRIDGE_JWT_SECRET`
- first-user seed passwords
- TLS private keys

Use `.env.example` only as a template. Generate a fresh JWT secret for every
deployment:

```bash
openssl rand -hex 32
```

## Deployment

Recommended production posture:

- bind the Go app to localhost
- terminate TLS at a reverse proxy
- keep the database outside the repo
- restrict access with a VPN, private network, or trusted authentication layer
- rotate `BRIDGE_JWT_SECRET` if it is ever exposed

Rotating `BRIDGE_JWT_SECRET` invalidates existing sessions.

## Reporting

Open a private GitHub security advisory if available. If not, open an issue with
minimal reproduction details and avoid posting working exploit payloads or real
secrets.
