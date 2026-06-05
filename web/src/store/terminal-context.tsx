import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react'

interface TerminalContextValue {
  sendKey: (data: string) => void
  registerSend: (fn: (data: string) => void) => void
  unregisterSend: () => void
}

const TerminalContext = createContext<TerminalContextValue | null>(null)

export function TerminalProvider({ children }: { children: ReactNode }) {
  const sendFnRef = useRef<((data: string) => void) | null>(null)

  const sendKey = useCallback((data: string) => {
    sendFnRef.current?.(data)
  }, [])

  const registerSend = useCallback((fn: (data: string) => void) => {
    sendFnRef.current = fn
  }, [])

  const unregisterSend = useCallback(() => {
    sendFnRef.current = null
  }, [])

  return (
    <TerminalContext.Provider value={{ sendKey, registerSend, unregisterSend }}>
      {children}
    </TerminalContext.Provider>
  )
}

export function useTerminal() {
  const ctx = useContext(TerminalContext)
  if (!ctx) throw new Error('useTerminal must be used within TerminalProvider')
  return ctx
}
