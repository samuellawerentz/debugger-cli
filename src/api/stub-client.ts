import type { ChatClient } from './client'
import type { ChatEvent } from '../state/types'

const CANNED = (text: string) =>
  `Got it — investigating: ${text}. Checking livekit session, room state, and recent errors...`

export class StubClient implements ChatClient {
  async *send(text: string, signal: AbortSignal): AsyncIterable<ChatEvent> {
    const words = CANNED(text).split(' ')
    for (const word of words) {
      if (signal.aborted) return
      yield { type: 'token', text: word + ' ' }
      await delay(80, signal)
      if (signal.aborted) return
    }
    yield { type: 'done' }
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}
