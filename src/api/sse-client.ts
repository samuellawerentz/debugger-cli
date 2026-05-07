import type { ChatClient } from './client'
import type { ChatEvent } from '../state/types'

// TODO: replace with real Plivo debugger chat URL
export const CHAT_URL = 'https://TODO.plivo.example/chat'

export class SseClient implements ChatClient {
  constructor(private authId: string, private token: string) {}

  async *send(text: string, signal: AbortSignal): AsyncIterable<ChatEvent> {
    const basic = Buffer.from(`${this.authId}:${this.token}`).toString('base64')

    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ message: text }),
      signal,
    })

    if (!res.ok || !res.body) {
      yield { type: 'error', message: `HTTP ${res.status}` }
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue
        try {
          const obj = JSON.parse(raw)
          if (obj.type === 'token') {
            yield { type: 'token', text: obj.text ?? '' }
          } else if (obj.type === 'done') {
            yield { type: 'done' }
            return
          } else if (obj.type === 'error') {
            yield { type: 'error', message: obj.message ?? 'unknown error' }
            return
          } else {
            yield { type: 'event', payload: obj }
          }
        } catch {
          yield { type: 'token', text: raw }
        }
      }
    }

    yield { type: 'done' }
  }
}
