import { createRoute, useNavigate } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { LoginForm } from '../components/auth/LoginForm'
import { useAuth } from '../store/auth-context'
import { useEffect } from 'react'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

function LoginPage() {
  const { status } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'authenticated') {
      navigate({ to: '/sessions' })
    }
  }, [status, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1117]">
      <LoginForm />
    </div>
  )
}
