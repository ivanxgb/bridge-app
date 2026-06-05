const API_BASE = '/api'

async function request(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {}
  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  })

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'same-origin',
    })
    if (refreshRes.ok) {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        credentials: 'same-origin',
        body: body ? JSON.stringify(body) : undefined,
      })
    }
  }

  return res
}


export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: unknown) => request('POST', path, body),
  delete: (path: string) => request('DELETE', path),
}
