import { useEffect } from 'react'
import { useAuthStore } from './state/auth-store'
import { LoginScreen } from './auth/login-screen'
import { ChatScreen } from './chat/chat-screen'
import { useAppKeymap } from './ui/keymap'

export function App() {
  const token = useAuthStore((s) => s.token)
  const hydrated = useAuthStore((s) => s.hydrated)
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => { hydrate() }, [])
  useAppKeymap()

  if (!hydrated) return <text>Loading...</text>
  if (!token) return <LoginScreen />
  return <ChatScreen />
}
