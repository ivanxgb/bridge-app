import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface User {
  id: number
  username: string
}

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthState {
  user: User | null
  status: AuthStatus
  login: (user: User) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')

  // Check auth state via /api/auth/me (cookie-based)
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then(res => {
        if (!cancelled && res.ok) {
          res.json().then(u => {
            setUser(u)
            setStatus('authenticated')
          })
        } else {
          setStatus('unauthenticated')
        }
      })
      .catch(() => { if (!cancelled) setStatus('unauthenticated') })
    return () => { cancelled = true }
  }, [])

  const login = useCallback((u: User) => {
    setUser(u)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
