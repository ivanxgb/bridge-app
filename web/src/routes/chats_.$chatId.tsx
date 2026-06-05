import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { ChatView } from '../components/chat/ChatView'

export const chatDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chats/$chatId',
  component: ChatDetail,
})

function ChatDetail() {
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <ChatView />
    </div>
  )
}
