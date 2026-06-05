# Bridge App — Integration Audit & Findings

> Generated: 2026-05-26 | After initial production deploy

## Root Cause: Session Detail Route Bypassing Auth

**Problem:** Clicking any session showed "No panes in this window" even though the API returns data correctly.

**Investigation chain:**

```
1. API test (curl): /api/sessions/vb-bridge/windows/0/panes → 200 OK with data ✅
2. Backend logs: 401 on /api/sessions, 401 on /api/auth/refresh ❌
3. Frontend code: sessions_.$sessionId.tsx uses raw fetch() — no auth token ❌
```

**Root cause:** The session detail route (`sessions_.$sessionId.tsx`) made all API calls via raw `fetch()` instead of using the `api` client (`api.get()`, `api.post()`) from `api/client.ts`. The raw fetch never injected the `Authorization: Bearer <token>` header, so every request hit the backend unauthenticated and got 401.

**Previous fix attempt (commit b3af7fb):** Added `useEffect` to auto-select first window — correct, but useless because the window fetch itself was getting 401.

**Actual fix (commit TBD):**
1. Replaced all 3 fetch calls in `sessions_.$sessionId.tsx` with `api.get()`
2. The sessions list query now reuses `fetchSessions` from `api/sessions.ts` (which already uses `api.get()`)
3. Windows and panes queries use `api.get()` directly

## Authentication Flow — Verified

| Component | Uses `api.get()`? | Token injected? |
|---|---|---|
| `SessionList.tsx` | ✅ `fetchSessions()` → `api.get()` | ✅ via `api/client.ts` |
| `CreateSessionButton.tsx` | ✅ raw fetch with `Authorization` header set manually | ✅ |
| `sessions_.$sessionId.tsx` | ✅ NOW FIXED | ✅ NOW FIXED |
| `auth.ts` | ✅ `api.post()` | ✅ via `api/client.ts` |

## Other Observations

### API Client Architecture
- `api/client.ts` reads token from `sessionStorage` key `bridge-auth` (same as `AuthContext`)
- Auto-refresh on 401 works correctly (sends stored `refresh_token`)
- No `setTokenGetter` callback needed — direct read is simpler and always in sync

### Backend Error Handling
- Sessions/windows/panes endpoints now return empty arrays on tmux errors instead of 500 text
- Auth endpoints continue returning 401 with appropriate error messages
- JSON errors use consistent format: `{"error": "message"}`

### Pending Improvements
- [ ] SessionList could add a "No panes" state with "Attach" CTA for detached sessions  
- [ ] WS reconnect from TerminalView works via exponential backoff, but starts immediately rather than waiting for user action
- [ ] Bundle size: 803KB (xterm.js is ~450KB); code-splitting would help with initial load
