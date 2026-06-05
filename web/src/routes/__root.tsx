import { Outlet, createRootRoute, useNavigate, useLocation } from '@tanstack/react-router'
import { AppShell } from '../components/layout/AppShell'
import { useAuth } from '../store/auth-context'
import { useEffect } from 'react'

export const rootRoute = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoginPage) {
      navigate({ to: '/login' })
    }
  }, [status, isLoginPage, navigate])

  // Show nothing while checking auth
  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117]">
        <div className="animate-spin w-6 h-6 text-[#8b949e]">
          <svg viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        </div>
      </div>
    )
  }

  if (isLoginPage || status === 'unauthenticated') {
    return <Outlet />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
