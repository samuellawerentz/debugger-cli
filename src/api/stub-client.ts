import type { ChatEvent } from '../state/types'
import type { ChatClient } from './client'

export class StubClient implements ChatClient {
  async *send(text: string, signal: AbortSignal): AsyncIterable<ChatEvent> {
    const intro = `Looking into "${text}". Let me check the session state.`
    for (const word of intro.split(' ')) {
      if (signal.aborted) return
      yield { type: 'token', text: `${word} ` }
      await delay(40, signal)
    }
    yield { type: 'token', text: '\n\n' }

    const callId = crypto.randomUUID()
    yield {
      type: 'tool_call',
      id: callId,
      name: 'get_session',
      args: { sessionId: 'sess_abc123', includeEvents: true },
    }
    await delay(300, signal)
    yield {
      type: 'tool_result',
      callId,
      ok: true,
      outputLang: 'json',
      output: JSON.stringify(
        { sessionId: 'sess_abc123', state: 'active', participants: 2, errors: [] },
        null,
        2,
      ),
    }
    await delay(200, signal)

    const followup = `Session is healthy. Here's a snippet you'd run to reproduce:\n\n\`\`\`ts\nconst s = await client.getSession("sess_abc123")\nconsole.log(s.state)\n\`\`\`\n`
    for (const word of followup.split(/(\s+)/)) {
      if (signal.aborted) return
      yield { type: 'token', text: word }
      await delay(25, signal)
    }
    yield { type: 'done' }
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}
