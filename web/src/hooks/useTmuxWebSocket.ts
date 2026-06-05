import { useEffect, useRef, useState, useCallback } from 'react'

export function useTmuxWebSocket(sessionId: string) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const onDataRef = useRef<((data: Uint8Array) => void) | null>(null)

  const connect = useCallback(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = location.host
    const url = `${protocol}//${host}/api/ws/session/${sessionId}`

    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        onDataRef.current?.(new Uint8Array(event.data))
      } else if (typeof event.data === 'string') {
        const encoder = new TextEncoder()
        onDataRef.current?.(encoder.encode(event.data))
      }
    }

    wsRef.current = ws
    return ws
  }, [sessionId])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  const resize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ columns: cols, rows }))
    }
  }, [])

  const onData = useCallback((cb: (data: Uint8Array) => void) => {
    onDataRef.current = cb
  }, [])

  useEffect(() => {
    return () => disconnect()
  }, [disconnect])

  return { connect, disconnect, send, resize, onData, connected, wsRef }
}
