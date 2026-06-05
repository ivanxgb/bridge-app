import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      setIsMobile(w < 768)
      setIsTablet(w >= 768 && w < 1024)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const [touchStart, setTouchStart] = useState(0)
  const handleTouchStart = useCallback((e: React.TouchEvent) => setTouchStart(e.touches[0].clientX), [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStart
    if (dx > 60 && touchStart < 40) setSidebarOpen(true)
    else if (dx < -60) setSidebarOpen(false)
  }, [touchStart])

  return (
      <div
        style={{
          height: 'var(--app-height, 100dvh)',
          display: 'flex',
          overflow: 'hidden',
          background: '#0d1117',
        }}
        onTouchStart={isMobile || isTablet ? handleTouchStart : undefined}
        onTouchEnd={isMobile || isTablet ? handleTouchEnd : undefined}
      >
        <Sidebar isOpen={sidebarOpen || (!isMobile && !isTablet)} isOverlay={isMobile || isTablet} onClose={closeSidebar} />
        {(isMobile || isTablet) && sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20" onClick={closeSidebar} />}

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
          <TopBar onMenuClick={toggleSidebar} showMenu={isMobile || isTablet} />
          <main style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {children}
          </main>
        </div>
      </div>
  )
}
