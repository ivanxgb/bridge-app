import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { fetchSessions } from '../../api/sessions'

export function SessionList() {
  const navigate = useNavigate()
  const { data: sessions, isLoading, error, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    refetchInterval: 5000,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 p-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded bg-[#21262d] animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3">
        <div className="rounded border border-[#f85149] p-3">
          <p className="text-[#f85149] text-sm mb-2">Failed to load sessions</p>
          <button
            onClick={() => refetch()}
            className="text-xs text-[#58a6ff] hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#8b949e] text-sm mb-3">No sessions running</p>
        <button
          onClick={() => {/* Will be connected to CreateSessionButton */}}
          className="text-sm text-[#58a6ff] hover:underline"
        >
          Create your first session
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => navigate({ to: '/sessions/$sessionId', params: { sessionId: session.name } })}
          className="w-full h-12 px-3 text-left hover:bg-[rgba(110,118,129,0.1)] transition-colors border-l-2 border-transparent hover:border-l-[#58a6ff] group"
        >
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  session.attached ? 'bg-[#3fb950]' : 'bg-[#8b949e]'
                }`}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-sm text-[#c9d1d9] truncate">
                  {session.name}
                </span>
                <span className="text-xs text-[#8b949e]">
                  {session.attached ? 'attached' : 'detached'}
                </span>
              </div>
            </div>
            <span className="text-xs text-[#8b949e] flex-shrink-0 ml-2">
              {session.windows}w
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
