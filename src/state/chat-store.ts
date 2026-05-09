import { truncate } from 'lodash'
import { v4 as uuid } from 'uuid'
import { create } from 'zustand'
import type { ChatClient } from '../api/client'
import { StubClient } from '../api/stub-client'
import { SessionDb, type TurnRecord, type TurnToolCall } from '../storage/session-db'
import type { ChatEvent, ChatMessage, ChatStatus, Message } from './types'

let _client: ChatClient = new StubClient()
export const setClient = (c: ChatClient) => {
  _client = c
}
const getClient = () => _client
let _sessionDb = new SessionDb()
export const setSessionDb = (db: SessionDb) => {
  _sessionDb = db
}
const getSessionDb = () => _sessionDb

const stringifyOutput = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return ''
  return JSON.stringify(value, null, 2)
}

const turnToMessages = (turn: TurnRecord): Message[] => {
  if (turn.role === 'user') {
    return [{ id: turn.id, role: 'user', content: turn.content, ts: turn.createdAt }]
  }

  const toolMessages = turn.toolCalls.flatMap((call): Message[] => {
    const callMessageId = `${turn.id}:${call.id}:call`
    const resultOutput = call.error ?? stringifyOutput(call.output)
    const resultMessages: Message[] =
      call.status === 'running' && !resultOutput
        ? []
        : [
            {
              id: `${turn.id}:${call.id}:result`,
              role: 'tool_result',
              callId: callMessageId,
              ok: call.status !== 'error',
              output: resultOutput,
              outputLang: typeof call.output === 'string' ? 'markdown' : 'json',
              ts: turn.updatedAt,
            },
          ]

    return [
      {
        id: callMessageId,
        role: 'tool_call',
        name: call.name,
        args: call.input ?? {},
        ts: turn.createdAt,
      },
      ...resultMessages,
    ]
  })

  const assistantMessages: Message[] = turn.content.trim()
    ? [{ id: turn.id, role: 'assistant', content: turn.content, ts: turn.createdAt }]
    : []

  const errorMessages: Message[] = turn.error
    ? [{ id: `${turn.id}:error`, role: 'system', content: turn.error, ts: turn.updatedAt }]
    : []

  return [...toolMessages, ...assistantMessages, ...errorMessages]
}

type ChatState = {
  activeSessionId: string | null
  messages: Message[]
  status: ChatStatus
  error?: string
  abort?: AbortController
  loadSession: (sessionId: string) => void
  send: (text: string) => Promise<void>
  cancel: () => void
  clear: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeSessionId: null,
  messages: [],
  status: 'idle',
  error: undefined,
  abort: undefined,

  loadSession(sessionId) {
    const turns = getSessionDb().listTurns(sessionId)
    set({
      activeSessionId: sessionId,
      messages: turns.flatMap(turnToMessages),
      status: 'idle',
      error: undefined,
      abort: undefined,
    })
  },

  async send(text: string) {
    const state = get()
    const sessionId = state.activeSessionId
    const history = state.messages.flatMap((m) =>
      (m.role === 'user' || m.role === 'assistant') && m.content.trim().length > 0
        ? [{ role: m.role, text: m.content }]
        : [],
    )
    const now = Date.now()

    const userMsg: Message = {
      id: uuid(),
      role: 'user',
      content: text,
      ts: now,
    }

    if (sessionId) {
      if (history.length === 0) {
        getSessionDb().renameSession(
          sessionId,
          truncate(text, { length: 48, omission: '...' }),
          now,
        )
      }
      getSessionDb().createTurn({ id: userMsg.id, sessionId, role: 'user', content: text, now })
    }

    set((s) => ({
      messages: [...s.messages, userMsg],
      status: 'streaming',
      error: undefined,
    }))

    const ctrl = new AbortController()
    set({ abort: ctrl })

    const appendMessage = (msg: Message) => set((s) => ({ messages: [...s.messages, msg] }))

    let assistantMessageId: string | undefined
    let assistantTurnId: string | undefined
    let assistantContent = ''
    let toolCalls: TurnToolCall[] = []

    const ensureAssistantTurn = (): string | undefined => {
      if (!sessionId) return undefined
      if (assistantTurnId) return assistantTurnId
      const turn = getSessionDb().createTurn({
        sessionId,
        role: 'assistant',
        status: 'streaming',
        content: assistantContent,
        toolCalls,
      })
      assistantTurnId = turn.id
      return turn.id
    }

    const persistAssistantTurn = (status: 'streaming' | 'complete' | 'error', error?: string) => {
      const id = ensureAssistantTurn()
      if (!id) return
      getSessionDb().updateTurn(id, { content: assistantContent, status, toolCalls, error })
    }

    const ensureAssistantMessage = (): string => {
      if (assistantMessageId) return assistantMessageId
      const msg: ChatMessage = {
        id: assistantTurnId ?? uuid(),
        role: 'assistant',
        content: '',
        ts: Date.now(),
      }
      assistantMessageId = msg.id
      appendMessage(msg)
      return msg.id
    }

    try {
      for await (const event of getClient().send(text, ctrl.signal, history)) {
        const e = event as ChatEvent
        if (e.type === 'token') {
          assistantContent += e.text
          ensureAssistantTurn()
          const id = ensureAssistantMessage()
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === id && m.role === 'assistant' ? { ...m, content: m.content + e.text } : m,
            ),
          }))
          persistAssistantTurn('streaming')
        } else if (e.type === 'tool_call') {
          ensureAssistantTurn()
          toolCalls = [...toolCalls, { id: e.id, name: e.name, input: e.args, status: 'running' }]
          persistAssistantTurn('streaming')
          assistantMessageId = undefined
          appendMessage({ id: e.id, role: 'tool_call', name: e.name, args: e.args, ts: Date.now() })
        } else if (e.type === 'tool_result') {
          toolCalls = toolCalls.map((call) =>
            call.id === e.callId
              ? {
                  ...call,
                  output: e.output,
                  status: e.ok ? 'complete' : 'error',
                  error: e.ok ? undefined : e.output,
                }
              : call,
          )
          persistAssistantTurn('streaming')
          assistantMessageId = undefined
          appendMessage({
            id: uuid(),
            role: 'tool_result',
            callId: e.callId,
            ok: e.ok,
            output: e.output,
            outputLang: e.outputLang,
            ts: Date.now(),
          })
        } else if (e.type === 'error') {
          persistAssistantTurn('error', e.message)
          set({ status: 'error', error: e.message })
          return
        } else if (e.type === 'done') {
          break
        }
      }
      if (assistantTurnId) persistAssistantTurn('complete')
      set({ status: 'idle', abort: undefined })
    } catch (err) {
      if (ctrl.signal.aborted) {
        set({ status: 'idle', abort: undefined })
      } else {
        persistAssistantTurn('error', String(err))
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
