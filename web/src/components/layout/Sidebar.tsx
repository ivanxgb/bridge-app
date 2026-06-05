import { useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { SessionList } from '../session/SessionList'
import { CreateSessionButton } from '../session/CreateSessionButton'

interface SidebarProps {
  isOpen: boolean
  isOverlay: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, isOverlay, onClose }: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const el = sidebarRef.current
    if (!el) return
    if (!isOverlay) { el.style.transform = ''; return }
    el.style.transform = isOpen ? 'translateX(0)' : 'translateX(-100%)'
  }, [isOpen, isOverlay])

  return (
    <aside
      ref={sidebarRef}
      style={{
        display: 'flex', flexDirection: 'column', background: '#111A27',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        width: 280, maxWidth: isOverlay ? '85vw' : undefined,
        position: isOverlay ? 'fixed' : 'relative',
        left: 0, top: 0, bottom: 0, zIndex: 30,
        transition: 'transform 0.2s', willChange: 'transform', flexShrink: 0,
      }}
    >
      <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#E6EDF7' }}>bridge</h1>
          <p style={{ fontSize: 11, color: '#7B8794' }}>Terminal & Agents</p>
        </div>
        {isOverlay && (
          <button onClick={onClose} style={{ color: '#9AA7B8', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        )}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '12px 16px 4px' }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: '#7B8794', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Terminal Sessions</h3>
        </div>
        <SessionList />

        <div style={{ padding: '12px 16px 4px', marginTop: 12 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: '#7B8794', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chat Sessions</h3>
        </div>
        <div style={{ padding: '0 16px' }}>
          <button
            onClick={() => { navigate({ to: '/chats' }); if (isOverlay) onClose() }}
            style={{
              width: '100%', padding: '10px 12px', background: '#162131',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
              color: '#E6EDF7', fontSize: 13, cursor: 'pointer', textAlign: 'left',
            }}
          >
            💬 View all chats
          </button>
        </div>
      </nav>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <CreateSessionButton />
      </div>
    </aside>
  )
}
