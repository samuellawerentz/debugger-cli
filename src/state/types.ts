export type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  ts: number
}

export type ChatStatus = 'idle' | 'streaming' | 'error'

export type ChatEvent =
  | { type: 'token'; text: string }
  | { type: 'event'; payload: unknown }
  | { type: 'error'; message: string }
  | { type: 'done' }
