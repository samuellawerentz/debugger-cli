import type { ChatEvent } from '../state/types'

export type HistoryTurn = { role: 'user' | 'assistant'; text: string }

export interface ChatClient {
  send(text: string, signal: AbortSignal, history: HistoryTurn[]): AsyncIterable<ChatEvent>
}
