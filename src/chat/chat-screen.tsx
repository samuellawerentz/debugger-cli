import { MessageList } from './message-list'
import { Composer } from './composer'
import { StatusBar } from '../ui/status-bar'

export function ChatScreen() {
  return (
    <box style={{ flexDirection: 'column', flexGrow: 1 }}>
      <MessageList />
      <Composer />
      <StatusBar />
    </box>
  )
}
