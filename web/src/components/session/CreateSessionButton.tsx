import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function CreateSessionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const queryClient = useQueryClient()

  const createSessionMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create session')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setSessionName('')
      setIsOpen(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionName.trim()) {
      createSessionMutation.mutate(sessionName.trim())
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSessionName('')
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full h-10 px-3 flex items-center gap-2 text-[#c9d1d9] hover:bg-[rgba(110,118,129,0.1)] transition-colors"
      >
        <span className="text-lg leading-none">+</span>
        <span className="text-sm">New Session</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-[400px] max-[768px]:w-[90%] bg-[#1c2128] border border-[#30363d] rounded-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#21262d] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#c9d1d9]">Create Session</h2>
              <button
                onClick={handleClose}
                className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 8.586L5.707 4.293a1 1 0 00-1.414 1.414L8.586 10l-4.293 4.293a1 1 0 101.414 1.414L10 11.414l4.293 4.293a1 1 0 001.414-1.414L11.414 10l4.293-4.293a1 1 0 00-1.414-1.414L10 8.586z" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit}>
              <div className="px-4 py-3">
                <label htmlFor="session-name" className="block text-sm text-[#c9d1d9] mb-2">
                  Session Name
                </label>
                <input
                  id="session-name"
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., dev, production"
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-[2px] text-[#c9d1d9] text-sm placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  autoFocus
                  disabled={createSessionMutation.isPending}
                />
                {createSessionMutation.isError && (
                  <p className="mt-2 text-sm text-[#f85149]">
                    Failed to create session. Please try again.
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-[#21262d] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 text-sm text-[#c9d1d9] bg-transparent border border-[#30363d] rounded-[2px] hover:bg-[rgba(110,118,129,0.1)] transition-colors disabled:opacity-50"
                  disabled={createSessionMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm text-white bg-[#58a6ff] rounded-[2px] hover:bg-[#79c0ff] transition-colors disabled:opacity-50"
                  disabled={!sessionName.trim() || createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
