import { create } from 'zustand'
import type { ChatClient } from '../api/client'
import { StubClient } from '../api/stub-client'
import type { ChatEvent, ChatMessage, ChatStatus, Message } from './types'

let _client: ChatClient = new StubClient()
export const setClient = (c: ChatClient) => {
  _client = c
}
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

    set((s) => ({
      messages: [...s.messages, userMsg],
      status: 'streaming',
      error: undefined,
    }))

    const ctrl = new AbortController()
    set({ abort: ctrl })

    const appendMessage = (msg: Message) => set((s) => ({ messages: [...s.messages, msg] }))

    let assistantId: string | undefined
    const ensureAssistant = (): string => {
      if (assistantId) return assistantId
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        ts: Date.now(),
      }
      assistantId = msg.id
      appendMessage(msg)
      return msg.id
    }

    try {
      for await (const event of getClient().send(text, ctrl.signal)) {
        const e = event as ChatEvent
        if (e.type === 'token') {
          const id = ensureAssistant()
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === id && m.role === 'assistant' ? { ...m, content: m.content + e.text } : m,
            ),
          }))
        } else if (e.type === 'tool_call') {
          assistantId = undefined
          appendMessage({ id: e.id, role: 'tool_call', name: e.name, args: e.args, ts: Date.now() })
        } else if (e.type === 'tool_result') {
          assistantId = undefined
          appendMessage({
            id: crypto.randomUUID(),
            role: 'tool_result',
            callId: e.callId,
            ok: e.ok,
            output: e.output,
            outputLang: e.outputLang,
            ts: Date.now(),
          })
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
