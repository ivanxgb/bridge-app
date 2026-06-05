import { api } from './client'

export async function login(username: string, password: string) {
  const res = await api.post('/auth/login', { username, password })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json()
}

export async function register(username: string, password: string) {
  const res = await api.post('/auth/register', { username, password })
  if (!res.ok) throw new Error('Registration failed')
  return res.json()
}

export async function me() {
  const res = await api.get('/auth/me')
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}
