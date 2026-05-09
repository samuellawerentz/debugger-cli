import type { ScrollBoxRenderable } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useRef } from 'react'
import { useChatStore } from '../state/chat-store'
import { Message } from './message'

const SCROLL_STEP = 3

export function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const status = useChatStore((s) => s.status)
  const lastId = messages[messages.length - 1]?.id
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  useKeyboard((key) => {
    if (!key.ctrl) return
    const box = scrollRef.current
    if (!box) return
    const half = Math.max(1, Math.floor(box.viewport.height / 2))
    if (key.name === 'k') box.scrollBy({ x: 0, y: -SCROLL_STEP })
    else if (key.name === 'j') box.scrollBy({ x: 0, y: SCROLL_STEP })
    else if (key.name === 'u') box.scrollBy({ x: 0, y: -half })
    else if (key.name === 'd') box.scrollBy({ x: 0, y: half })
  })

  return (
    <scrollbox
      ref={scrollRef}
      stickyScroll
      stickyStart="bottom"
      style={{ flexGrow: 1, flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}
    >
      {messages.map((m) => (
        <Message
          key={m.id}
          message={m}
          isStreaming={status === 'streaming' && m.role === 'assistant' && m.id === lastId}
        />
      ))}
    </scrollbox>
  )
}
