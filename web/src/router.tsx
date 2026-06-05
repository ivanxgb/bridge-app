import { createRouter, RouterProvider } from '@tanstack/react-router'
import { rootRoute } from './routes/__root'
import { indexRoute } from './routes/index'
import { loginRoute } from './routes/login'
import { sessionsRoute } from './routes/sessions'
import { sessionDetailRoute } from './routes/sessions_.$sessionId'
import { chatsRoute } from './routes/chats'
import { chatDetailRoute } from './routes/chats_.$chatId'

const routeTree = rootRoute.addChildren([
  indexRoute, loginRoute, sessionsRoute, sessionDetailRoute,
  chatsRoute, chatDetailRoute,
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
