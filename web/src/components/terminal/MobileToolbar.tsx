import { useState, useCallback, useRef, useEffect } from 'react'
import { useTerminal } from '../../store/terminal-context'
import { useMobileDetect } from '../../hooks/useMobileDetect'

interface ToolbarKey {
  label: string
  sequence: string
  modifier?: boolean
  extended?: boolean
}

const MAIN_KEYS: ToolbarKey[] = [
  { label: 'Esc', sequence: '\x1b' },
  { label: 'Tab', sequence: '\t' },
  { label: 'Ctrl', sequence: '', modifier: true },
  { label: 'Alt', sequence: '', modifier: true },
  { label: 'C-b', sequence: '\x02' },
  { label: '↑', sequence: '\x1b[A' },
  { label: '↓', sequence: '\x1b[B' },
  { label: '←', sequence: '\x1b[D' },
  { label: '→', sequence: '\x1b[C' },
]

const EXTENDED_KEYS: ToolbarKey[] = [
  { label: '/', sequence: '/' },
  { label: ':', sequence: ':' },
  { label: '-', sequence: '-' },
  { label: 'Space', sequence: ' ' },
  { label: 'Enter', sequence: '\r' },
  { label: 'PgUp', sequence: '\x1b[5~' },
  { label: 'PgDn', sequence: '\x1b[6~' },
  { label: '|', sequence: '|' },
]

type StickyMod = 'ctrl' | 'alt' | null

export function MobileToolbar() {
  const isMobile = useMobileDetect()
  const { sendKey } = useTerminal()
  const [stickyMod, setStickyMod] = useState<StickyMod>(null)
  const [showExtended, setShowExtended] = useState(false)
  const [touchY, setTouchY] = useState(0)

  const handleKeyPress = useCallback((key: ToolbarKey) => {
    if (key.modifier) {
      const mod = key.label.toLowerCase() as StickyMod
      setStickyMod(prev => prev === mod ? null : mod)
      return
    }

    let sequence = key.sequence
    if (stickyMod === 'ctrl') {
      if (key.sequence.length === 1 && key.sequence >= 'a' && key.sequence <= 'z') {
        sequence = String.fromCharCode(key.sequence.charCodeAt(0) - 96)
      }
    } else if (stickyMod === 'alt') {
      sequence = '\x1b' + key.sequence
    }

    sendKey(sequence)
    setStickyMod(null)
  }, [sendKey, stickyMod])

  const handleSwipeUp = useCallback(() => {
    setShowExtended(prev => !prev)
  }, [])

  if (!isMobile) return null

  const keys = showExtended
    ? [...MAIN_KEYS, ...EXTENDED_KEYS]
    : MAIN_KEYS

  return (
    <div
      style={{ flexShrink: 0 }}
      onTouchStart={(e) => { setTouchY(e.touches[0].clientY) }}
      onTouchEnd={(e) => {
        const dy = touchY - e.changedTouches[0].clientY
        if (dy > 50) handleSwipeUp()
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          padding: '4px 4px',
          overflowX: 'auto',
          background: '#2d333b',
          borderTop: '1px solid #30363d',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {keys.map((key) => {
          const isSticky = (key.label.toLowerCase() === stickyMod)
          return (
            <button
              key={key.label + (showExtended ? '-ext' : '')}
              onTouchStart={(e) => {
                e.preventDefault()
                handleKeyPress(key)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 36,
                height: 36,
                padding: '0 6px',
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: 500,
                border: '1px solid',
                borderRadius: 2,
                transition: 'background-color 75ms',
                userSelect: 'none',
                flexShrink: 0,
                background: isSticky ? '#58a6ff' : '#1c2128',
                color: isSticky ? '#fff' : '#c9d1d9',
                borderColor: isSticky ? '#58a6ff' : '#30363d',
                touchAction: 'manipulation',
              }}
            >
              {key.label === 'C-b' ? (<span><span style={{fontSize:10}}>C-</span>b</span>) : key.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
