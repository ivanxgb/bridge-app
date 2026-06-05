import { ReactNode } from 'react'
import { Navigate } from '@tanstack/react-router'
import { useAuth } from '../../store/auth-context'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'checking') {
    return <div className="flex items-center justify-center h-screen bg-[#08111F]">
      <div className="animate-spin w-6 h-6 text-[#9AA7B8]">
        <svg viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      </div>
    </div>
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" />
  }
  return <>{children}</>
}
