import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchChatSession } from '../../api/chat'
import { useChatWebSocket, ChatEvent } from '../../hooks/useChatWebSocket'

interface StreamMsg { role: string; content: string }
interface ThinkingInfo { blockId: number; title: string; content: string; done: boolean }
interface ToolInfo { blockId: number; toolName: string; input: string; output: string; done: boolean }

export function ChatView() {
  const chatId = Number(useParams({ from: '/chats/$chatId' }).chatId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [streams, setStreams] = useState<Record<number, StreamMsg>>({})
  const [thinkings, setThinkings] = useState<Record<number, ThinkingInfo>>({})
  const [tools, setTools] = useState<Record<number, ToolInfo>>({})
  const [status, setStatus] = useState('idle')

  const { data, isLoading } = useQuery({
    queryKey: ['chat-session', chatId],
    queryFn: () => fetchChatSession(chatId),
  })

  const messages = data?.messages ?? []
  const session = data?.session

  useEffect(() => { if (session?.status) setStatus(session.status) }, [session])

  const { connect, disconnect, sendMessage, stop, onEvent } = useChatWebSocket(chatId)

  useEffect(() => {
    const ws = connect()

    const cleanup = onEvent((ev: ChatEvent) => {
      switch (ev.type) {
        case 'message_start':
          setStreams(s => ({ ...s, [ev.data.messageId]: { role: ev.data.role, content: '' } }))
          break
        case 'message_delta':
          setStreams(s => {
            const cur = s[ev.data.messageId]
            return { ...s, [ev.data.messageId]: { role: cur?.role || 'assistant', content: (cur?.content || '') + ev.data.delta } }
          })
          break
        case 'message_done':
          setStreams(s => {
            const cur = s[ev.data.messageId]
            return { ...s, [ev.data.messageId]: { role: cur?.role || 'assistant', content: ev.data.content || cur?.content || '' } }
          })
          break
        case 'thinking_start':
          setThinkings(t => ({ ...t, [ev.data.blockId]: { blockId: ev.data.blockId, title: ev.data.title || 'Thinking...', content: '', done: false } }))
          break
        case 'thinking_delta':
          setThinkings(t => {
            const cur = t[ev.data.blockId]
            return cur ? { ...t, [ev.data.blockId]: { ...cur, content: cur.content + ev.data.delta } } : t
          })
          break
        case 'thinking_done':
          setThinkings(t => {
            const cur = t[ev.data.blockId]
            return cur ? { ...t, [ev.data.blockId]: { ...cur, content: ev.data.content || cur.content, done: true } } : t
          })
          break
        case 'tool_start':
          setTools(t => ({ ...t, [ev.data.blockId]: { blockId: ev.data.blockId, toolName: ev.data.toolName, input: ev.data.input || '', output: '', done: false } }))
          break
        case 'tool_delta':
          setTools(t => {
            const cur = t[ev.data.blockId]
            return cur ? { ...t, [ev.data.blockId]: { ...cur, output: cur.output + ev.data.delta } } : t
          })
          break
        case 'tool_done':
          setTools(t => {
            const cur = t[ev.data.blockId]
            return cur ? { ...t, [ev.data.blockId]: { ...cur, output: ev.data.output || cur.output, done: true } } : t
          })
          break
        case 'status':
          setStatus(ev.data.status)
          break
        case 'error':
          console.error('[chat]', ev.data.message)
          break
      }
    })

    return () => { ws.close(); disconnect(); cleanup() }
  }, [connect, disconnect, onEvent])

  // Scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [streams, thinkings, tools])

  const [input, setInput] = useState('')
  const isRunning = status === 'running'

  const handleSend = useCallback(() => {
    if (!input.trim() || isRunning) return
    sendMessage(input)
    setInput('')
    setStatus('running')
  }, [input, sendMessage, isRunning])

  // Merge messages + streams into a flat timeline, interleaving thinking/tool blocks
  const buildTimeline = () => {
    const items: { id: string; role: string; content: string }[] = []
    for (const m of messages) items.push({ id: `db-${m.id}`, role: m.role, content: m.content })
    for (const [id, s] of Object.entries(streams)) {
      if (s.content) items.push({ id: `stream-${id}`, role: s.role, content: s.content })
    }
    return items
  }

  const timeline = buildTimeline()
  const sortedThinkings = Object.values(thinkings).sort((a, b) => a.blockId - b.blockId)
  const sortedTools = Object.values(tools).sort((a, b) => a.blockId - b.blockId)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#08111F', color: '#9AA7B8' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#08111F' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: '#111A27', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF7', margin: 0 }}>{session?.title || 'Chat'}</h2>
            <span style={{ fontSize: 12, color: isRunning ? '#F59E0B' : status === 'done' ? '#22C55E' : '#7B8794' }}>
              {session?.kind} · {status}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isRunning && (
            <button onClick={() => stop()} style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {timeline.length === 0 && sortedThinkings.length === 0 && sortedTools.length === 0 && (
          <div style={{ textAlign: 'center', color: '#7B8794', marginTop: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <p style={{ fontSize: 14 }}>Send a message to start</p>
          </div>
        )}

        {timeline.map(msg => (
          <div key={msg.id} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: 12, background: msg.role === 'user' ? '#162131' : '#111A27', border: '1px solid rgba(255,255,255,0.06)', color: '#E6EDF7', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <Markdown text={msg.content} />
            </div>
          </div>
        ))}

        {/* Thinking blocks */}
        {sortedThinkings.map(t => <ThinkingBlock key={t.blockId} {...t} />)}
        {/* Tool cards */}
        {sortedTools.map(t => <ToolCallCard key={t.blockId} {...t} />)}
      </div>

      {/* Composer */}
      <div style={{ padding: '8px 16px', background: '#111A27', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={isRunning ? 'Waiting for response...' : 'Type a message...'}
            disabled={isRunning}
            rows={1}
            style={{
              flex: 1, background: '#0B1220', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '8px 14px', color: isRunning ? '#7B8794' : '#E6EDF7', fontSize: 14,
              resize: 'none', outline: 'none', fontFamily: 'system-ui', opacity: isRunning ? 0.6 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isRunning}
            style={{
              background: '#60A5FA', color: 'white', border: 'none', borderRadius: 12,
              padding: '8px 20px', fontSize: 14, fontWeight: 600,
              cursor: input.trim() && !isRunning ? 'pointer' : 'default',
              opacity: input.trim() && !isRunning ? 1 : 0.4,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function ThinkingBlock({ blockId, title, content, done }: ThinkingInfo) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', textAlign: 'left', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 10, padding: '8px 14px', color: '#F59E0B', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span>{done ? '💭 ' : '🔄 '}{title}{!done ? '...' : ''}</span>
        <span style={{ fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          marginTop: 4, padding: '10px 14px', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)',
          borderRadius: 10, color: '#E6EDF7', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 300, overflowY: 'auto',
        }}>
          {content}
        </div>
      )}
    </div>
  )
}

function ToolCallCard({ blockId, toolName, input, output, done }: ToolInfo) {
  const [open, setOpen] = useState(false)
  const toolColor = toolName === 'SHELL' ? '#22C55E' : toolName === 'EDIT' || toolName === 'WRITE' ? '#60A5FA' : '#A78BFA'
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', textAlign: 'left', background: `${toolColor}10`, border: `1px solid ${toolColor}30`,
          borderRadius: 10, padding: '8px 14px', color: toolColor, fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <span>🛠 {toolName}{input ? `: ${input.slice(0, 60)}` : ''}{!done ? '...' : ' ✓'}</span>
        <span style={{ fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          marginTop: 4, padding: '10px 14px', background: `${toolColor}05`, border: `1px solid ${toolColor}15`,
          borderRadius: 10, color: '#E6EDF7', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5,
          maxHeight: 300, overflowY: 'auto', fontFamily: 'monospace',
        }}>
          {output}
        </div>
      )}
    </div>
  )
}

function Markdown({ text }: { text: string }) {
  if (!text) return null
  // Simple inline markdown: code blocks, bold, line breaks
  const parts = text.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w*\n?/, '')
          return <pre key={i} style={{ background: '#0B1220', borderRadius: 8, padding: '8px 12px', margin: '8px 0', overflow: 'auto', fontSize: 13, fontFamily: 'monospace' }}>{code}</pre>
        }
        return <span key={i}>{part.split('\n').map((line, j, arr) => (
          <span key={j}>{line}{j < arr.length - 1 ? <br /> : null}</span>
        ))}</span>
      })}
    </>
  )
}
