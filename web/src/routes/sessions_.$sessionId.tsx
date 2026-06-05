import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useQuery } from '@tanstack/react-query'
import { TerminalView } from '../components/terminal/TerminalView'
import { type Session, fetchSessions } from '../api/sessions'

export const sessionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/$sessionId',
  component: SessionDetailComponent,
})

function SessionDetailComponent() {
  const { sessionId } = sessionDetailRoute.useParams()

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  })

  const session = sessions?.find(s => s.name === sessionId)

  if (isLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9AA7B8', background: '#08111F' }}>Loading...</div>
  }

  if (!session) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9AA7B8', background: '#08111F' }}>Session not found</div>
  }

  const statusColor = session.attached ? '#22C55E' : '#7B8794'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#111A27', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF7' }}>{session.name}</h1>
          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: `${statusColor}20`, color: statusColor }}>
            {session.attached ? 'attached' : 'detached'}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TerminalView sessionId={session.name} />
      </div>
    </div>
  )
}
