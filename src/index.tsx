import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { App } from './app'
import { useAuthStore } from './state/auth-store'
import { setClient } from './state/chat-store'
import { SseClient } from './api/sse-client'
import { StubClient } from './api/stub-client'

useAuthStore.subscribe((s, prev) => {
  if (s.authId !== prev.authId || s.token !== prev.token) {
    setClient(s.authId && s.token ? new SseClient(s.authId, s.token) : new StubClient())
  }
})

const renderer = await createCliRenderer({ exitOnCtrlC: true })
createRoot(renderer).render(<App />)
