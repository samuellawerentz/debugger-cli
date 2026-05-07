import { useChatStore } from '../state/chat-store'
import { Message } from './message'

export function MessageList() {
  const messages = useChatStore((s) => s.messages)

  return (
    // TODO: auto-scroll to bottom — scrollbox ref API not yet documented; using key trick as workaround
    <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }}>
      {messages.map((m) => (
        <Message key={m.id} message={m} />
      ))}
    </scrollbox>
  )
}
