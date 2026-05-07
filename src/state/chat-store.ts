import { create } from 'zustand'
import { StubClient } from '../api/stub-client'
import type { ChatClient } from '../api/client'
import type { Message, ChatStatus, ChatEvent } from './types'

let _client: ChatClient = new StubClient()
export const setClient = (c: ChatClient) => { _client = c }
const getClient = () => _client

type ChatState = {
  messages: Message[]
  status: ChatStatus
  error?: string
  abort?: AbortController
  send: (text: string) => Promise<void>
  cancel: () => void
  clear: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  status: 'idle',
  error: undefined,
  abort: undefined,

  async send(text: string) {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      ts: Date.now(),
    }
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      ts: Date.now(),
    }

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      status: 'streaming',
      error: undefined,
    }))

    const ctrl = new AbortController()
    set({ abort: ctrl })

    try {
      for await (const event of getClient().send(text, ctrl.signal)) {
        const e = event as ChatEvent
        if (e.type === 'token') {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: m.content + e.text } : m
            ),
          }))
        } else if (e.type === 'error') {
          set({ status: 'error', error: e.message })
          return
        } else if (e.type === 'done') {
          break
        }
      }
      set({ status: 'idle', abort: undefined })
    } catch (err) {
      if (ctrl.signal.aborted) {
        set({ status: 'idle', abort: undefined })
      } else {
        set({ status: 'error', error: String(err), abort: undefined })
      }
    }
  },

  cancel() {
    get().abort?.abort()
    set({ status: 'idle', abort: undefined })
  },

  clear() {
    get().abort?.abort()
    set({ messages: [], status: 'idle', error: undefined, abort: undefined })
  },
}))
