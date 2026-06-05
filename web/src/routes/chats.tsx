import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { fetchChatSessions, ChatSession } from '../api/chat'

export const chatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chats',
  component: ChatList,
})

function ChatList() {
  const navigate = useNavigate()
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: fetchChatSessions,
  })

  if (isLoading) {
    return <div style={{ padding: 24, color: '#9AA7B8' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto', height: '100%', overflowY: 'auto', background: '#08111F' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF7', marginBottom: 4 }}>Chat Sessions</h1>
      <p style={{ fontSize: 14, color: '#9AA7B8', marginBottom: 24 }}>Your AI agent conversations</p>

      {(!sessions || sessions.length === 0) && (
        <div style={{ textAlign: 'center', color: '#7B8794', marginTop: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
          <p>No chat sessions yet</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions?.map(s => (
          <div
            key={s.id}
            onClick={() => navigate({ to: '/chats/$chatId', params: { chatId: String(s.id) } })}
            style={{
              padding: '14px 16px', background: '#111A27', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#E6EDF7' }}>{s.title}</span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 6,
                background: s.kind === 'codex' ? 'rgba(96,165,250,0.15)' : 'rgba(168,139,250,0.15)',
                color: s.kind === 'codex' ? '#60A5FA' : '#A78BFA',
              }}>{s.kind}</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 12, color: s.status === 'done' ? '#22C55E' : s.status === 'error' ? '#EF4444' : '#F59E0B' }}>
                {s.status}
              </span>
              <span style={{ fontSize: 12, color: '#9AA7B8' }}>
                {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
