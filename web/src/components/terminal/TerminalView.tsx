import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { useTmuxWebSocket } from '../../hooks/useTmuxWebSocket'

interface TerminalViewProps {
  sessionId: string
}

const THEME = {
  background: '#0d1117',
  foreground: '#c9d1d9',
  cursor: '#58a6ff',
  cursorAccent: '#0d1117',
  selectionBackground: 'rgba(88,166,255,0.3)',
  black: '#0d1117', red: '#f85149', green: '#3fb950', yellow: '#d29922',
  blue: '#58a6ff', magenta: '#bc8cff', cyan: '#39c5cf', white: '#c9d1d9',
  brightBlack: '#484f58', brightRed: '#ff7b72', brightGreen: '#7ee787',
  brightYellow: '#e3b341', brightBlue: '#79c0ff', brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd', brightWhite: '#ffffff',
}

type ArrowMode = 'CSI' | 'APP'
type WsState = 'connecting' | 'open' | 'closed'

interface UIState {
  focused: boolean
  wsState: WsState
  inputReady: boolean
  scrollMode: boolean
  keyboardVisible: boolean
  pasteAvailable: boolean
  lastTx: string
  lastRxAt: number
  cols: number
  rows: number
  arrowMode: ArrowMode
}

function updateAppHeight() {
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  document.documentElement.style.setProperty('--app-height', `${height}px`)
}

// Human-readable label for escape sequences
function txLabel(seq: string): string {
  if (seq === '\x1b[A') return '↑CSI'
  if (seq === '\x1b[B') return '↓CSI'
  if (seq === '\x1b[C') return '→CSI'
  if (seq === '\x1b[D') return '←CSI'
  if (seq === '\x1bOA') return '↑APP'
  if (seq === '\x1bOB') return '↓APP'
  if (seq === '\x1bOC') return '→APP'
  if (seq === '\x1bOD') return '←APP'
  if (seq === '\x1b') return 'ESC'
  if (seq === '\t') return 'TAB'
  if (seq === '\r') return 'ENT'
  if (seq === '\x1b[Z') return 'S-TAB'
  if (seq === '\x02[') return 'C-b['
  if (seq === '\x1b[5~') return 'PgUp'
  if (seq === '\x1b[6~') return 'PgDn'
  if (seq === 'q') return 'q'
  if (seq.startsWith('paste:')) return seq
  return JSON.stringify(seq)
}

export function TerminalView({ sessionId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initDoneRef = useRef(false)
  const lastRxAtRef = useRef(0)
  const arrowModeRef = useRef<ArrowMode>('CSI')

  const [ui, setUI] = useState<UIState>({
    focused: false, wsState: 'connecting', inputReady: false,
    scrollMode: false, keyboardVisible: false, pasteAvailable: false,
    lastTx: '', lastRxAt: 0, cols: 80, rows: 24,
    arrowMode: 'CSI',
  })

  const set = useCallback((patch: Partial<UIState>) => {
    setUI(s => ({ ...s, ...patch }))
  }, [])

  const { connect, disconnect, resize: sendResize, onData, wsRef } = useTmuxWebSocket(sessionId)

  // ---- HELPERS ----
  const wsSend = useCallback((data: string): boolean => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) { ws.send(data); return true }
    return false
  }, [wsRef])

  const refocus = useCallback(() => {
    requestAnimationFrame(() => termRef.current?.focus())
  }, [])

  // ---- ARROW MODE ----
  const getArrowMode = useCallback((): ArrowMode => {
    const term = termRef.current
    // xterm core exposes modes via private API
    const appMode = (term as any)?._core?.coreService?.modes?.applicationCursorKeysMode
    return appMode ? 'APP' : 'CSI'
  }, [])

  const detectArrowMode = useCallback(() => {
    const mode = getArrowMode()
    arrowModeRef.current = mode
    set({ arrowMode: mode })
  }, [getArrowMode, set])

  const arrowSeq = useCallback((dir: 'up' | 'down' | 'left' | 'right'): string => {
    const mode = arrowModeRef.current
    const csi: Record<string, string> = { up: '\x1b[A', down: '\x1b[B', right: '\x1b[C', left: '\x1b[D' }
    const app: Record<string, string> = { up: '\x1bOA', down: '\x1bOB', right: '\x1bOC', left: '\x1bOD' }
    return mode === 'APP' ? app[dir] : csi[dir]
  }, [])

  const sendArrow = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    detectArrowMode()
    const seq = arrowSeq(dir)
    const ok = wsSend(seq)
    set({ lastTx: txLabel(seq), inputReady: ok, focused: true })
    refocus()
  }, [wsSend, refocus, set, detectArrowMode, arrowSeq])

  // ---- OTHER ACTIONS ----
  const sendKey = useCallback((data: string) => {
    const ok = wsSend(data)
    set({ lastTx: txLabel(data), inputReady: ok, focused: true })
    refocus()
  }, [wsSend, refocus, set])

  const focusTerminal = useCallback(() => {
    termRef.current?.focus()
    requestAnimationFrame(() => { termRef.current?.focus(); set({ focused: true }) })
  }, [set])

  const shiftRef = useRef(false)
  const toggleShift = useCallback(() => {
    shiftRef.current = !shiftRef.current
    set({ lastTx: shiftRef.current ? '⇧ON' : '⇧OFF' })
    refocus()
  }, [set, refocus])

  const sendTab = useCallback(() => {
    if (shiftRef.current) { shiftRef.current = false; sendKey('\x1b[Z') }
    else { sendKey('\t') }
  }, [sendKey])

  const toggleScroll = useCallback(() => {
    setUI(s => {
      if (s.scrollMode) { sendKey('q'); return { ...s, scrollMode: false } }
      else { sendKey('\x02['); return { ...s, scrollMode: true } }
    })
  }, [sendKey])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        const ok = wsSend(text)
        set({ lastTx: `paste:${text.length}c`, focused: true, inputReady: ok })
      }
    } catch { set({ pasteAvailable: false }) }
    refocus()
  }, [wsSend, set, refocus])

  // ---- INIT XTERM ----
  useEffect(() => {
    if (!containerRef.current || initDoneRef.current) return

    const term = new Terminal({
      cursorBlink: true, cursorStyle: 'bar', convertEol: false,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, Menlo, monospace",
      fontSize: window.innerWidth < 768 ? 13 : 14,
      scrollback: 10000, allowProposedApi: true, theme: THEME,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())
    term.open(containerRef.current)

    const el = containerRef.current

    // Focus only on xterm area — use pointerup to not interfere with selection
    el.addEventListener('pointerup', (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target?.closest('.xterm')) {
        term.focus()
      }
    }, { passive: true })

    // Detect focus/blur from xterm's hidden textarea
    const detectFocus = () => {
      const ta = el.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement | null
      if (!ta) { requestAnimationFrame(detectFocus); return }
      ta.addEventListener('focus', () => { set({ focused: true }); detectArrowMode() })
      ta.addEventListener('blur', () => set({ focused: false }))
    }
    requestAnimationFrame(detectFocus)

    // Detect arrow mode changes (CSI ↔ APP) — poll xterm internals
    const arrowPoll = setInterval(() => detectArrowMode(), 1000)

    // Input → WebSocket
    term.onData(data => {
      const open = wsSend(data)
      set({ lastTx: txLabel(data), focused: true, inputReady: open })
    })

    // Resize
    let tid: ReturnType<typeof setTimeout>
    const doFit = () => {
      clearTimeout(tid)
      tid = setTimeout(() => {
        try {
          updateAppHeight()
          fitAddon.fit()
          sendResize(term.cols, term.rows)
          set({ cols: term.cols, rows: term.rows })
        } catch {}
      }, 120)
    }

    updateAppHeight()
    requestAnimationFrame(() => {
      fitAddon.fit()
      sendResize(term.cols, term.rows)
      set({ cols: term.cols, rows: term.rows })
    })

    window.addEventListener('resize', doFit)
    window.addEventListener('orientationchange', doFit)
    window.visualViewport?.addEventListener('resize', doFit)
    window.visualViewport?.addEventListener('scroll', doFit)

    termRef.current = term
    fitAddonRef.current = fitAddon
    initDoneRef.current = true

    return () => {
      clearInterval(arrowPoll)
      el.removeEventListener('pointerup', () => {})
      window.removeEventListener('resize', doFit)
      window.removeEventListener('orientationchange', doFit)
      window.visualViewport?.removeEventListener('resize', doFit)
      window.visualViewport?.removeEventListener('scroll', doFit)
      clearTimeout(tid)
    }
  }, [])

  // Connect WS
  useEffect(() => {
    if (!initDoneRef.current) return
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // WS data → xterm
  useEffect(() => {
    onData(data => {
      lastRxAtRef.current = Date.now()
      termRef.current?.write(data)
    })
  }, [onData])

  // Poll WS state
  useEffect(() => {
    const ival = setInterval(() => {
      const ws = wsRef.current
      const s = ws?.readyState
      let wsState: WsState = 'closed'
      if (s === 0) wsState = 'connecting'
      if (s === 1) wsState = 'open'
      set({
        wsState,
        inputReady: s === 1 && !!termRef.current,
        lastRxAt: lastRxAtRef.current,
      })
    }, 500)
    return () => clearInterval(ival)
  }, [wsRef, set])

  // Keyboard detection
  useEffect(() => {
    const check = () => {
      const vv = window.visualViewport
      set({ keyboardVisible: vv ? vv.height < window.innerHeight * 0.8 : false })
    }
    window.visualViewport?.addEventListener('resize', check)
    window.visualViewport?.addEventListener('scroll', check)
    check()
    return () => {
      window.visualViewport?.removeEventListener('resize', check)
      window.visualViewport?.removeEventListener('scroll', check)
    }
  }, [set])

  // Clipboard check
  useEffect(() => {
    set({ pasteAvailable: typeof navigator.clipboard?.readText === 'function' })
  }, [set])

  // ---- STATUS ROW ----
  const wsColor = ui.wsState === 'open' ? '#22C55E' : ui.wsState === 'connecting' ? '#F59E0B' : '#EF4444'
  const focusColor = ui.focused ? '#22C55E' : '#7B8794'
  const inputColor = ui.inputReady ? '#22C55E' : '#7B8794'
  const kbColor = ui.keyboardVisible ? '#60A5FA' : '#7B8794'

  const statusBadge = (label: string, color: string) => (
    <span style={{ fontSize: 10, color, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{label}</span>
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0d1117', display: 'flex', flexDirection: 'column' }}>
      {/* Status row */}
      <div style={{
        display: 'flex', gap: 8, padding: '2px 8px', background: '#111A27',
        borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center',
        overflowX: 'auto', flexShrink: 0, minHeight: 24,
        WebkitOverflowScrolling: 'touch',
      }}>
        {statusBadge(ui.wsState === 'open' ? 'WS' : ui.wsState === 'connecting' ? 'WS·' : 'WS✗', wsColor)}
        {statusBadge(ui.focused ? 'FOC' : 'foc', focusColor)}
        {statusBadge(ui.inputReady ? 'IN' : 'in', inputColor)}
        {statusBadge(ui.keyboardVisible ? '⌨' : '·', kbColor)}
        {statusBadge(ui.arrowMode === 'APP' ? 'APP' : 'CSI', ui.arrowMode === 'APP' ? '#F59E0B' : '#9AA7B8')}
        {statusBadge(ui.scrollMode ? 'SCL' : '', ui.scrollMode ? '#F59E0B' : '#7B8794')}
        {statusBadge(ui.pasteAvailable ? 'PT' : '', ui.pasteAvailable ? '#22C55E' : '#7B8794')}
        <span style={{ fontSize: 10, color: '#7B8794', fontFamily: 'monospace' }}>TX:{ui.lastTx}</span>
        {ui.lastRxAt > 0 && <span style={{ fontSize: 10, color: '#7B8794', fontFamily: 'monospace' }}>RX:{new Date(ui.lastRxAt).toISOString().slice(11,19)}</span>}
        <span style={{ fontSize: 10, color: '#7B8794', fontFamily: 'monospace' }}>{ui.cols}x{ui.rows}</span>
      </div>

      {/* Terminal */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />

      {/* Command bar — two fixed rows, no horizontal scroll */}
      <div style={{ flexShrink: 0, background: '#111A27', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 4, padding: '4px 4px 0 4px',
          flexWrap: 'wrap',
        }}>
          <CmdBtn label="←"  active={false} color="#9AA7B8" onClick={() => sendArrow('left')} />
          <CmdBtn label="↓"  active={false} color="#9AA7B8" onClick={() => sendArrow('down')} />
          <CmdBtn label="↑"  active={false} color="#9AA7B8" onClick={() => sendArrow('up')} />
          <CmdBtn label="→"  active={false} color="#9AA7B8" onClick={() => sendArrow('right')} />
          <CmdBtn label="Esc" active={false} color="#EF4444" onClick={() => sendKey('\x1b')} />
          <CmdBtn label={shiftRef.current ? '⇧ON' : '⇧'} active={shiftRef.current} color={shiftRef.current ? '#F59E0B' : '#9AA7B8'} onClick={toggleShift} />
          <CmdBtn label="Tab" active={false} color="#9AA7B8" onClick={sendTab} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 4, padding: '2px 4px 4px 4px',
          flexWrap: 'wrap',
        }}>
          <CmdBtn label="PgUp" active={ui.scrollMode} color={ui.scrollMode ? '#F59E0B' : '#9AA7B8'} onClick={() => sendKey('\x1b[5~')} />
          <CmdBtn label="PgDn" active={ui.scrollMode} color={ui.scrollMode ? '#F59E0B' : '#9AA7B8'} onClick={() => sendKey('\x1b[6~')} />
          <CmdBtn label="Scroll" active={ui.scrollMode} color={ui.scrollMode ? '#F59E0B' : '#9AA7B8'} onClick={toggleScroll} />
          <CmdBtn label="Focus" active={ui.focused} color={ui.focused ? '#22C55E' : '#60A5FA'} onClick={focusTerminal} />
          <CmdBtn label="Paste" active={false} color={ui.pasteAvailable ? '#22C55E' : '#7B8794'} onClick={handlePaste} />
        </div>
      </div>
    </div>
  )
}

function CmdBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onPointerDown={e => { e.preventDefault(); onClick() }}
      style={{
        background: active ? 'rgba(255,255,255,0.06)' : '#162131',
        color, border: active ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8, padding: '4px 8px', fontSize: 12, fontFamily: 'monospace',
        fontWeight: 500, touchAction: 'manipulation', cursor: 'pointer',
        whiteSpace: 'nowrap', transition: 'border-color 0.15s',
      }}
    >{label}</button>
  )
}
