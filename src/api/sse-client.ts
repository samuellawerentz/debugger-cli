import { appendFileSync } from 'node:fs'
import type { ChatClient } from './client'
import type { ChatEvent } from '../state/types'

export const CHAT_URL = 'http://127.0.0.1:5010/v1/aiassist/buddy-ext/chat'
const LOG_PATH = '/tmp/debugger-cli.log'

const log = (msg: string) => {
  try { appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`) } catch {}
}

export class SseClient implements ChatClient {
  constructor(private authId: string, private token: string) {}

  async *send(text: string, signal: AbortSignal): AsyncIterable<ChatEvent> {
    const basic = Buffer.from(`${this.authId}:${this.token}`).toString('base64')
    log(`POST ${CHAT_URL} authId=${this.authId} body=${JSON.stringify({ message: text })}`)

    let res: Response
    try {
      res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ message: text, history: [] }),
        signal,
      })
    } catch (err) {
      const msg = `network error: ${String(err)}`
      log(msg)
      yield { type: 'error', message: msg }
      return
    }

    log(`status=${res.status} ${res.statusText}`)

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => '')
      log(`error body: ${body.slice(0, 500)}`)
      yield { type: 'error', message: `HTTP ${res.status}: ${body.slice(0, 200) || res.statusText}` }
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      log(`chunk: ${chunk.replace(/\n/g, '\\n')}`)
      buf += chunk
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue
        let obj: { type?: string; data?: Record<string, unknown> }
        try {
          obj = JSON.parse(raw)
        } catch {
          yield { type: 'token', text: raw }
          continue
        }
        switch (obj.type) {
          case 'token':
          case 'message':
            yield { type: 'token', text: String(obj.data?.text ?? '') }
            break
          case 'final':
            yield { type: 'done' }
            return
          case 'error':
            yield { type: 'error', message: String(obj.data?.message ?? 'stream error') }
            return
          case 'start':
            break
          default:
            yield { type: 'event', payload: obj }
        }
      }
    }

    yield { type: 'done' }
  }
}
