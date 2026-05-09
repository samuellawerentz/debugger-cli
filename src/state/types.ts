export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  ts: number
}

export type ToolCallMessage = {
  id: string
  role: 'tool_call'
  name: string
  args: unknown
  ts: number
}

export type ToolResultMessage = {
  id: string
  role: 'tool_result'
  callId: string
  ok: boolean
  output: string
  outputLang?: string
  ts: number
}

export type Message = ChatMessage | ToolCallMessage | ToolResultMessage

export type ChatStatus = 'idle' | 'streaming' | 'error'

export type ChatEvent =
  | { type: 'token'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: unknown }
  | { type: 'tool_result'; callId: string; ok: boolean; output: string; outputLang?: string }
  | { type: 'event'; payload: unknown }
  | { type: 'error'; message: string }
  | { type: 'done' }
