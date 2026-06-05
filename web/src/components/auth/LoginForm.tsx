import { useState, FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../store/auth-context'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const auth = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        setError('Invalid username or password')
        return
      }
      const data = await res.json()
      auth.login(data.user)
      navigate({ to: '/sessions' })
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: '#08111F' }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: 360,
        background: '#111A27', borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 32,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E6EDF7', marginBottom: 6 }}>bridge-app</h1>
          <p style={{ fontSize: 13, color: '#9AA7B8' }}>Secure access to your remote terminal workspace</p>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#9AA7B8', fontWeight: 500 }}>Email or username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{
              width: '100%', height: 44, padding: '0 14px',
              background: '#0B1220', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#E6EDF7', fontSize: 15, outline: 'none',
            }}
            autoFocus
            onFocus={e => e.target.style.borderColor = '#60A5FA'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#9AA7B8', fontWeight: 500 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%', height: 44, padding: '0 14px',
              background: '#0B1220', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#E6EDF7', fontSize: 15, outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#60A5FA'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', height: 44,
            background: loading ? '#2563EB' : '#60A5FA',
            color: '#fff', borderRadius: 12, border: 'none',
            fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#7B8794' }}>SSH · tmux · agents</p>
        </div>
      </form>
    </div>
  )
}
