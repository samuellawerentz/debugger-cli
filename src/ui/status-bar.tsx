import { useAuthStore } from '../state/auth-store'
import { useChatStore } from '../state/chat-store'

export function StatusBar() {
  const baseUrl = useAuthStore((s) => s.baseUrl)
  const status = useChatStore((s) => s.status)

  return (
    <text fg="#888">
      {status} • {baseUrl} • Ctrl+C quit · Esc cancel · Ctrl+L clear · Ctrl+K logout
    </text>
  )
}
