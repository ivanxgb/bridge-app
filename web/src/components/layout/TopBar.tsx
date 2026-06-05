import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../store/auth-context'

interface TopBarProps {
  onMenuClick: () => void
  showMenu: boolean
}

export function TopBar({ onMenuClick, showMenu }: TopBarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <header style={{
      height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', background: '#111A27', borderBottom: '1px solid rgba(255,255,255,0.06)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showMenu && (
          <button onClick={onMenuClick} style={{ color: '#9AA7B8', background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M2 4.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </button>
        )}
        <span style={{ fontSize: 14, fontWeight: 600, color: '#E6EDF7', fontFamily: 'system-ui' }}>bridge</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <span style={{ fontSize: 12, color: '#9AA7B8' }}>{user.username}</span>
        )}
        <button onClick={handleLogout} style={{ fontSize: 12, color: '#9AA7B8', background: 'none', border: 'none', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
    </header>
  )
}
