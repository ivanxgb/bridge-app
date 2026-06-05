interface WindowTabsProps {
  windows: Array<{ id: string; name: string }>
  activeWindowId: string
  onWindowChange: (windowId: string) => void
  isLoading?: boolean
}

export function WindowTabs({ windows, activeWindowId, onWindowChange, isLoading }: WindowTabsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-1 p-2 bg-[#0d1117] border-b border-[#30363d]">
        <div className="h-9 w-24 bg-[#1c2128] rounded animate-pulse"></div>
        <div className="h-9 w-24 bg-[#1c2128] rounded animate-pulse"></div>
      </div>
    )
  }

  if (!windows || windows.length === 0) {
    return (
      <div className="flex gap-1 p-2 bg-[#0d1117] border-b border-[#30363d]">
        <div className="h-9 px-4 flex items-center bg-[#1c2128] border-b-2 border-[#58a6ff] text-[#c9d1d9] font-mono text-[13px]">
          default
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0d1117] border-b border-[#30363d]">
      <div className="flex gap-1 p-2 overflow-x-auto md:overflow-x-visible scrollbar-thin">
        {windows.map((window, index) => {
          const isActive = window.id === activeWindowId
          const isLast = index === windows.length - 1
          
          return (
            <button
              key={window.id}
              onClick={() => onWindowChange(window.id)}
              className={`
                group relative h-9 px-4 flex items-center gap-2 shrink-0
                font-mono text-[13px] transition-colors
                ${isActive 
                  ? 'bg-[#1c2128] border-b-2 border-[#58a6ff] text-[#c9d1d9]' 
                  : 'bg-transparent border-b-2 border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#1c2128]/50'
                }
              `}
            >
              <span>{window.name || `Window ${index + 1}`}</span>
              
              {/* Close icon - visible on hover except for last window */}
              {!isLast && (
                <span 
                  className="hidden group-hover:block text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Implement close window functionality
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
