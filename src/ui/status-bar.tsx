import { useAuthStore } from '../state/auth-store'
import { useChatStore } from '../state/chat-store'

export function StatusBar() {
  const authId = useAuthStore((s) => s.authId)
  const status = useChatStore((s) => s.status)
  const error = useChatStore((s) => s.error)

  return (
    <box style={{ flexDirection: 'column' }}>
      {error ? <text fg="#FF5555">error: {error}</text> : null}
      <text fg="#888">
        {status} • {authId} • Ctrl+C quit · Esc cancel · Ctrl+L clear · Ctrl+K logout · log: /tmp/debugger-cli.log
      </text>
    </box>
  )
}
