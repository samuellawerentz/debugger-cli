import { Palette } from '../ui/palette'
import { StatusBar } from '../ui/status-bar'
import { Composer } from './composer'
import { MessageList } from './message-list'

export function ChatScreen() {
  return (
    <box style={{ flexDirection: 'column', flexGrow: 1 }}>
      <MessageList />
      <Composer />
      <StatusBar />
      <Palette />
    </box>
  )
}
