import type { ChatEvent } from '../state/types'

export interface ChatClient {
  send(text: string, signal: AbortSignal): AsyncIterable<ChatEvent>
}
