import { api } from './client'

export interface ChatSession {
  id: number
  kind: 'codex' | 'commandcode'
  title: string
  status: 'running' | 'waiting_input' | 'done' | 'error' | 'stopped'
  cwd: string
  tmuxName: string
  userId: number
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: number
  chatSessionId: number
  role: 'user' | 'assistant'
  content: string
  status: 'streaming' | 'done' | 'error'
  createdAt: string
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
  const res = await api.get('/chat-sessions')
  if (!res.ok) throw new Error('Failed to fetch chat sessions')
  return res.json()
}

export async function createChatSession(body: {
  kind: 'codex' | 'commandcode'
  title?: string
  cwd?: string
  initialInstruction?: string
}): Promise<ChatSession> {
  const res = await api.post('/chat-sessions', body)
  if (!res.ok) throw new Error('Failed to create chat session')
  return res.json()
}

export async function fetchChatSession(id: number): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
  const res = await api.get(`/chat-sessions/${id}`)
  if (!res.ok) throw new Error('Failed to fetch chat session')
  return res.json()
}

export async function attachChatTerminal(id: number): Promise<{ tmuxName: string }> {
  const res = await api.post(`/chat-sessions/${id}/attach-terminal`)
  if (!res.ok) throw new Error('No terminal session available')
  return res.json()
}
