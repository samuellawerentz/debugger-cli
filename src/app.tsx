import { useEffect } from 'react'
import { LoginScreen } from './auth/login-screen'
import { ChatScreen } from './chat/chat-screen'
import { SessionHomeScreen } from './sessions/session-home-screen'
import { useAuthStore } from './state/auth-store'
import { useChatStore } from './state/chat-store'
import { useSessionStore } from './state/session-store'
import { useAppKeymap } from './ui/keymap'

export function App() {
  const token = useAuthStore((s) => s.token)
  const hydrated = useAuthStore((s) => s.hydrated)
  const hydrate = useAuthStore((s) => s.hydrate)
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const clearActiveSession = useSessionStore((s) => s.clearActiveSession)
  const loadSession = useChatStore((s) => s.loadSession)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!token) clearActiveSession()
  }, [token, clearActiveSession])

  useEffect(() => {
    if (activeSessionId) loadSession(activeSessionId)
  }, [activeSessionId, loadSession])

  useAppKeymap()

  if (!hydrated) return <text>Loading...</text>
  if (!token) return <LoginScreen />
  if (!activeSessionId) return <SessionHomeScreen />
  return <ChatScreen />
}
