import { useKeyboard, useRenderer } from '@opentui/react'
import { useChatStore } from '../state/chat-store'
import { useAuthStore } from '../state/auth-store'

export function useAppKeymap() {
  const renderer = useRenderer()
  const cancel = useChatStore((s) => s.cancel)
  const clear = useChatStore((s) => s.clear)
  const logout = useAuthStore((s) => s.logout)

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'c') {
      renderer.destroy()
    } else if (key.name === 'escape') {
      cancel()
    } else if (key.ctrl && key.name === 'l') {
      clear()
    } else if (key.ctrl && key.name === 'k') {
      logout()
    }
  })
}
