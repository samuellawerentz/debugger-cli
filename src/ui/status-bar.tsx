import { useAuthStore } from '../state/auth-store'
import { useChatStore } from '../state/chat-store'

export function StatusBar() {
  const authId = useAuthStore((s) => s.authId)
  const status = useChatStore((s) => s.status)

  return (
    <text fg="#888">
      {status} • {authId} • Ctrl+C quit · Esc cancel · Ctrl+L clear · Ctrl+K logout
    </text>
  )
}
