import { appendFileSync } from 'node:fs'
import { v4 as uuid } from 'uuid'
import type { ChatEvent } from '../state/types'
import type { ChatClient, HistoryTurn } from './client'

export const CHAT_URL = 'http://127.0.0.1:5010/v1/aiassist/buddy-ext/chat'
const LOG_PATH = '/tmp/debugger-cli.log'

const log = (msg: string) => {
  try {
    appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${msg}\n`)
  } catch {}
}

export class SseClient implements ChatClient {
  constructor(
    private authId: string,
    private token: string,
  ) {}

  async *send(text: string, signal: AbortSignal, history: HistoryTurn[]): AsyncIterable<ChatEvent> {
    const basic = Buffer.from(`${this.authId}:${this.token}`).toString('base64')
    log(
      `POST ${CHAT_URL} authId=${this.authId} historyTurns=${history.length} message=${text.slice(0, 80)}`,
    )

    let res: Response
    try {
      res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ message: text, history }),
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
      yield {
        type: 'error',
        message: `HTTP ${res.status}: ${body.slice(0, 200) || res.statusText}`,
      }
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    const callIdsByName = new Map<string, string>()

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
          case 'tool_call': {
            const name = String(obj.data?.name ?? 'tool')
            const id = uuid()
            callIdsByName.set(name, id)
            yield { type: 'tool_call', id, name, args: obj.data?.args ?? {} }
            break
          }
          case 'tool_output': {
            const name = String(obj.data?.name ?? 'tool')
            const callId = callIdsByName.get(name) ?? uuid()
            const data = obj.data ?? {}
            const ok = data.success !== false && !data.error
            const output =
              typeof data.preview === 'string' && data.preview
                ? data.preview
                : JSON.stringify(data, null, 2)
            yield { type: 'tool_result', callId, ok, output, outputLang: 'json' }
            break
          }
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
