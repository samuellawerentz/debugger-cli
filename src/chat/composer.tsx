import { useState } from 'react'
import { useChatStore } from '../state/chat-store'
import { useUIStore } from '../ui/ui-store'

export function Composer() {
  const [value, setValue] = useState('')
  const send = useChatStore((s) => s.send)
  const status = useChatStore((s) => s.status)
  const paletteOpen = useUIStore((s) => s.paletteOpen)

  const handleSubmit = () => {
    const text = value.trim()
    if (!text || status === 'streaming') return
    setValue('')
    send(text)
  }

  return (
    <box title="Message" style={{ border: true, height: 5, paddingTop: 1, paddingBottom: 1, paddingLeft: 1, paddingRight: 1, marginTop: 1 }}>
      <input
        placeholder="Type a message and press Enter... (Ctrl+P for menu)"
        value={value}
        onInput={setValue}
        onSubmit={handleSubmit}
        focused={!paletteOpen}
      />
    </box>
  )
}
