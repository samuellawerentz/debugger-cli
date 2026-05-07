import type { Message as MessageType } from '../state/types'

const ROLE_COLORS: Record<MessageType['role'], string> = {
  user: '#00FFFF',
  assistant: '#00FF00',
  system: '#FFFF00',
}

type Props = { message: MessageType }

export function Message({ message }: Props) {
  const color = ROLE_COLORS[message.role]
  return (
    <box style={{ flexDirection: 'row', gap: 1 }}>
      <text fg={color}>[{message.role}]</text>
      <text>{message.content}</text>
    </box>
  )
}
