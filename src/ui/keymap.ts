import { useKeyboard, useRenderer } from '@opentui/react'
import { useChatStore } from '../state/chat-store'
import { useUIStore } from './ui-store'

export function useAppKeymap() {
  const renderer = useRenderer()
  const cancel = useChatStore((s) => s.cancel)
  const clear = useChatStore((s) => s.clear)

  useKeyboard((key) => {
    const ui = useUIStore.getState()

    if (key.ctrl && key.name === 'p') {
      ui.toggle()
      return
    }

    if (ui.paletteOpen) return

    if (key.ctrl && key.name === 'c') {
      renderer.destroy()
    } else if (key.name === 'escape') {
      cancel()
    } else if (key.ctrl && key.name === 'l') {
      clear()
    }
  })
}
