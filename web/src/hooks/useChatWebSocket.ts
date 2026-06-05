import { useRef, useCallback, useEffect } from 'react'

export type ChatEvent =
  | { type: 'message_start'; data: { messageId: number; role: 'user' | 'assistant' } }
  | { type: 'message_delta'; data: { messageId: number; delta: string } }
  | { type: 'message_done'; data: { messageId: number; content: string } }
  | { type: 'thinking_start'; data: { blockId: number; title?: string } }
  | { type: 'thinking_delta'; data: { blockId: number; delta: string } }
  | { type: 'thinking_done'; data: { blockId: number; content: string } }
  | { type: 'tool_start'; data: { blockId: number; toolName: string; input?: string } }
  | { type: 'tool_delta'; data: { blockId: number; delta: string } }
  | { type: 'tool_done'; data: { blockId: number; output?: string; exitCode?: number } }
  | { type: 'status'; data: { sessionId: number; status: string } }
  | { type: 'error'; data: { message: string } }

export function useChatWebSocket(chatId: number) {
  const wsRef = useRef<WebSocket | null>(null)
  const eventCbRef = useRef<((ev: ChatEvent) => void) | null>(null)

  const connect = useCallback(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = location.host
    const url = `${protocol}//${host}/api/ws/chat/${chatId}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const ev = JSON.parse(event.data) as ChatEvent
        eventCbRef.current?.(ev)
      } catch {}
    }

    return ws
  }, [chatId])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const sendMessage = useCallback((content: string) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'message', content }))
    }
  }, [])

  const stop = useCallback(() => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }))
    }
  }, [])

  const onEvent = useCallback((cb: (ev: ChatEvent) => void) => {
    eventCbRef.current = cb
    return () => { eventCbRef.current = null }
  }, [])

  useEffect(() => {
    return () => disconnect()
  }, [disconnect])

  return { connect, disconnect, sendMessage, stop, onEvent, wsRef }
}
