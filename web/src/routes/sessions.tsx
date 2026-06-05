import { createRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { createChatSession } from '../api/chat'
import { useState } from 'react'

export const sessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions',
  component: WorkspaceHome,
})

function WorkspaceHome() {
  const navigate = useNavigate()
  const [sheetKind, setSheetKind] = useState<'codex' | 'commandcode' | null>(null)
  const [sheetTitle, setSheetTitle] = useState('')
  const [sheetPrompt, setSheetPrompt] = useState('')

  const startChat = async (kind: 'codex' | 'commandcode', mode: 'chat' | 'terminal') => {
    if (mode === 'terminal') {
      navigate({ to: `/sessions/$sessionId`, params: { sessionId: kind } })
      return
    }
    try {
      const session = await createChatSession({
        kind,
        title: sheetTitle || `${kind} chat`,
        initialInstruction: sheetPrompt || undefined,
      })
      setSheetKind(null)
      setSheetTitle('')
      setSheetPrompt('')
      navigate({ to: '/chats/$chatId', params: { chatId: String(session.id) } })
    } catch {}
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto', height: '100%', overflowY: 'auto', background: '#08111F' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF7', marginBottom: 4 }}>Your workspace</h1>
      <p style={{ fontSize: 14, color: '#9AA7B8', marginBottom: 24 }}>Connect to an existing session or start a new one</p>

      {/* Quick actions */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#9AA7B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ActionCard label="Codex Chat" icon="⌘" color="#60A5FA" onClick={() => setSheetKind('codex')} />
          <ActionCard label="CC Chat" icon="★" color="#A78BFA" onClick={() => setSheetKind('commandcode')} />
          <ActionCard label="New shell" icon=">" color="#22C55E" onClick={() => navigate({ to: `/sessions/$sessionId`, params: { sessionId: 'bash' } })} />
          <ActionCard label="Chat list" icon="💬" color="#9AA7B8" onClick={() => navigate({ to: '/chats' })} />
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#9AA7B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sessions</h2>
        <p style={{ fontSize: 14, color: '#7B8794' }}>Open the sidebar to browse sessions</p>
      </div>

      {/* New Chat Sheet */}
      {sheetKind && (
        <>
          <div onClick={() => setSheetKind(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
            background: '#111A27', borderRadius: '16px 16px 0 0',
            padding: 24, borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF7', marginBottom: 16 }}>
              New {sheetKind === 'codex' ? 'Codex' : 'CommandCode'} Chat
            </h3>
            <input
              value={sheetTitle}
              onChange={e => setSheetTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                width: '100%', padding: '10px 14px', background: '#0B1220', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, color: '#E6EDF7', fontSize: 14, marginBottom: 8, outline: 'none',
              }}
            />
            <textarea
              value={sheetPrompt}
              onChange={e => setSheetPrompt(e.target.value)}
              placeholder="Initial instruction (optional)"
              rows={2}
              style={{
                width: '100%', padding: '10px 14px', background: '#0B1220', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, color: '#E6EDF7', fontSize: 14, marginBottom: 16, resize: 'none', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => startChat(sheetKind, 'chat')}
                style={{
                  flex: 1, padding: '10px 16px', background: '#60A5FA', color: 'white',
                  border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Start Chat
              </button>
              <button
                onClick={() => startChat(sheetKind, 'terminal')}
                style={{
                  flex: 1, padding: '10px 16px', background: '#162131', color: '#9AA7B8',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 14, cursor: 'pointer',
                }}
              >
                Terminal
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ActionCard({ label, icon, color, onClick }: { label: string; icon: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '16px 12px', background: '#111A27',
        borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onPointerEnter={e => e.currentTarget.style.borderColor = color}
      onPointerLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
    >
      <span style={{ fontSize: 20, color }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#E6EDF7', fontWeight: 500 }}>{label}</span>
    </button>
  )
}
