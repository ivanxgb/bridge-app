import { useState } from 'react'

interface Pane {
  id: string
  name: string
  cwd?: string
}

interface PaneGridProps {
  panes: Pane[]
  layout?: 'horizontal' | 'vertical' | 'grid'
  children: (paneId: string) => React.ReactNode
}

export function PaneGrid({ panes, layout = 'grid', children }: PaneGridProps) {
  const [activePaneId, setActivePaneId] = useState(panes[0]?.id || '')
  const [maximizedPaneId, setMaximizedPaneId] = useState<string | null>(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (panes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#8b949e]">
        No panes available
      </div>
    )
  }

  if (maximizedPaneId) {
    const maximizedPane = panes.find(p => p.id === maximizedPaneId)
    if (maximizedPane) {
      return (
        <div className="flex flex-col h-full">
          <PaneHeader
            pane={maximizedPane}
            isMaximized={true}
            onToggleMaximize={() => setMaximizedPaneId(null)}
          />
          <div className="flex-1 bg-[#0d1117]">
            {children(maximizedPane.id)}
          </div>
        </div>
      )
    }
  }

  // Mobile: tabs + single pane
  if (isMobile) {
    const activePane = panes.find(p => p.id === activePaneId) || panes[0]
    return (
      <div className="flex flex-col h-full">
        {panes.length > 1 && (
          <div className="flex bg-[#161b22] border-b border-[#30363d]">
            {panes.map((pane) => (
              <button
                key={pane.id}
                onClick={() => setActivePaneId(pane.id)}
                className={`
                  flex-1 px-3 py-2 text-[13px] font-mono transition-colors
                  ${pane.id === activePaneId
                    ? 'bg-[#1c2128] text-[#c9d1d9] border-b-2 border-[#58a6ff]'
                    : 'text-[#8b949e] hover:text-[#c9d1d9]'
                  }
                `}
              >
                {pane.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col flex-1">
          {panes.length > 1 && (
            <PaneHeader
              pane={activePane}
              isMaximized={false}
              onToggleMaximize={() => setMaximizedPaneId(activePane.id)}
            />
          )}
          <div className="flex-1 bg-[#0d1117]">
            {children(activePane.id)}
          </div>
        </div>
      </div>
    )
  }

  // Desktop: single pane
  if (panes.length === 1) {
    return (
      <div className="flex flex-col h-full">
        <PaneHeader
          pane={panes[0]}
          isMaximized={false}
          onToggleMaximize={() => setMaximizedPaneId(panes[0].id)}
        />
        <div className="flex-1 bg-[#0d1117]">
          {children(panes[0].id)}
        </div>
      </div>
    )
  }

  // Desktop: 2 panes
  if (panes.length === 2) {
    const isHorizontal = layout === 'horizontal'
    return (
      <div className={`flex ${isHorizontal ? 'flex-col' : 'flex-row'} h-full`}>
        {panes.map((pane, index) => (
          <div
            key={pane.id}
            className={`flex flex-col flex-1 ${
              index < panes.length - 1
                ? isHorizontal
                  ? 'border-b-2 border-[#30363d]'
                  : 'border-r-2 border-[#30363d]'
                : ''
            }`}
          >
            <PaneHeader
              pane={pane}
              isMaximized={false}
              onToggleMaximize={() => setMaximizedPaneId(pane.id)}
            />
            <div className="flex-1 bg-[#0d1117]">
              {children(pane.id)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Desktop: 3+ panes grid
  return (
    <div className="grid grid-cols-2 gap-[2px] h-full bg-[#30363d]">
      {panes.map((pane) => (
        <div key={pane.id} className="flex flex-col bg-[#0d1117]">
          <PaneHeader
            pane={pane}
            isMaximized={false}
            onToggleMaximize={() => setMaximizedPaneId(pane.id)}
          />
          <div className="flex-1">
            {children(pane.id)}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaneHeader({ pane, isMaximized, onToggleMaximize }: {
  pane: Pane
  isMaximized: boolean
  onToggleMaximize: () => void
}) {
  return (
    <div className="flex items-center justify-between px-3 h-7 bg-[#161b22] border-b border-[#30363d]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[12px] font-mono text-[#c9d1d9] truncate">{pane.name}</span>
        {pane.cwd && <span className="text-[11px] text-[#8b949e] truncate">{pane.cwd}</span>}
      </div>
      <button
        onClick={onToggleMaximize}
        className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
        aria-label={isMaximized ? 'Restore pane' : 'Maximize pane'}
      >
        {isMaximized ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.5 1a.5.5 0 0 1 .5.5V3h7a1 1 0 0 1 1 1v7h1.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V13H4a1 1 0 0 1-1-1V4H1.5a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5h4zM4 4v7h8V4H4z"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 1 0V3h11v11h-1.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-1 0V13H3V2h1.5a.5.5 0 0 0 0-1h-3z"/>
            <path d="M4.5 8a.5.5 0 0 1 .5.5V11h2.5a.5.5 0 0 1 0 1H5a1 1 0 0 1-1-1V8.5a.5.5 0 0 1 .5-.5z"/>
          </svg>
        )}
      </button>
    </div>
  )
}
