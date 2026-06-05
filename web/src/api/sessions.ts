import { api } from './client'

export interface Session {
  id: string
  name: string
  windows: number
  created: string
  attached: boolean
}

export interface Window {
  id: string
  name: string
  active: boolean
}

export interface Pane {
  id: string
  title: string
  active: boolean
  pid: string
}

export async function fetchSessions() {
  const res = await api.get('/sessions')
  if (!res.ok) throw new Error('Failed to fetch sessions')
  return res.json() as Promise<Session[]>
}

export async function createSession(name: string) {
  const res = await api.post('/sessions', { name })
  if (!res.ok) throw new Error('Failed to create session')
}

export async function killSession(id: string) {
  const res = await api.delete(`/sessions/${id}`)
  if (!res.ok) throw new Error('Failed to kill session')
}

export async function fetchWindows(sessionId: string) {
  const res = await api.get(`/sessions/${sessionId}/windows`)
  if (!res.ok) throw new Error('Failed to fetch windows')
  return res.json() as Promise<Window[]>
}

export async function fetchPanes(sessionId: string, windowId: string) {
  const res = await api.get(`/sessions/${sessionId}/windows/${windowId}/panes`)
  if (!res.ok) throw new Error('Failed to fetch panes')
  return res.json() as Promise<Pane[]>
}
