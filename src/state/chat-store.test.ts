import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ChatClient, HistoryTurn } from '../api/client'
import { SessionDb } from '../storage/session-db'
import { setClient, setSessionDb, useChatStore } from './chat-store'
import type { ChatEvent } from './types'

class TestClient implements ChatClient {
  lastHistory: HistoryTurn[] = []
  constructor(private events: ChatEvent[]) {}

  async *send(
    _text: string,
    _signal: AbortSignal,
    history: HistoryTurn[],
  ): AsyncIterable<ChatEvent> {
    this.lastHistory = history
    for (const event of this.events) yield event
  }
}

let tempDir: string | null = null
let db: SessionDb

const createTestDb = () => {
  tempDir = mkdtempSync(join(tmpdir(), 'debugger-cli-chat-'))
  db = new SessionDb(join(tempDir, 'debugger.sqlite'))
  setSessionDb(db)
}

beforeEach(() => {
  createTestDb()
  setClient(new TestClient([{ type: 'done' }]))
  useChatStore.setState({
    activeSessionId: null,
    messages: [],
    status: 'idle',
    error: undefined,
    abort: undefined,
  })
})

afterEach(() => {
  db.close()
  if (!tempDir) return
  rmSync(tempDir, { recursive: true, force: true })
  tempDir = null
})

describe('useChatStore session persistence', () => {
  test('loads existing session turns into visible chat messages', () => {
    const session = db.createSession({ id: 'session-1', authId: 'MA123', title: 'Debug call' })
    db.createTurn({
      id: 'user-1',
      sessionId: session.id,
      role: 'user',
      content: 'Why did this fail?',
      now: 100,
    })
    db.createTurn({
      id: 'assistant-1',
      sessionId: session.id,
      role: 'assistant',
      content: 'The call failed because the destination was unreachable.',
      status: 'complete',
      toolCalls: [
        {
          id: 'tool-1',
          name: 'fetch_logs',
          input: { callUuid: 'abc' },
          output: { status: 'failed' },
          status: 'complete',
        },
      ],
      now: 101,
    })

    useChatStore.getState().loadSession(session.id)

    expect(useChatStore.getState().messages).toEqual([
      expect.objectContaining({ id: 'user-1', role: 'user', content: 'Why did this fail?' }),
      expect.objectContaining({ role: 'tool_call', name: 'fetch_logs', args: { callUuid: 'abc' } }),
      expect.objectContaining({
        role: 'tool_result',
        ok: true,
        output: '{\n  "status": "failed"\n}',
      }),
      expect.objectContaining({
        id: 'assistant-1',
        role: 'assistant',
        content: 'The call failed because the destination was unreachable.',
      }),
    ])
  })

  test('persists user, assistant content, and tool calls while sending', async () => {
    const session = db.createSession({ id: 'session-1', authId: 'MA123', title: 'New session' })
    useChatStore.getState().loadSession(session.id)
    setClient(
      new TestClient([
        { type: 'tool_call', id: 'tool-1', name: 'fetch_logs', args: { callUuid: 'abc' } },
        { type: 'tool_result', callId: 'tool-1', ok: true, output: '{"status":"failed"}' },
        { type: 'token', text: 'The call failed.' },
        { type: 'done' },
      ]),
    )

    await useChatStore.getState().send('Debug call abc')

    const turns = db.listTurns(session.id)
    expect(turns).toEqual([
      expect.objectContaining({ role: 'user', content: 'Debug call abc', status: 'complete' }),
      expect.objectContaining({
        role: 'assistant',
        content: 'The call failed.',
        status: 'complete',
        toolCalls: [
          {
            id: 'tool-1',
            name: 'fetch_logs',
            input: { callUuid: 'abc' },
            output: '{"status":"failed"}',
            status: 'complete',
          },
        ],
      }),
    ])
    expect(db.getSession(session.id)?.title).toBe('Debug call abc')
  })
})

describe('useChatStore stream events', () => {
  test('appends user msg and accumulates assistant tokens to idle on done', async () => {
    setClient(
      new TestClient([
        { type: 'token', text: 'hello ' },
        { type: 'token', text: 'world' },
        { type: 'done' },
      ]),
    )

    await useChatStore.getState().send('hi')
    const { messages, status } = useChatStore.getState()

    expect(status).toBe('idle')
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ role: 'user', content: 'hi' })
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'hello world' })
  })

  test('tool_call splits the assistant accumulator into a new block', async () => {
    setClient(
      new TestClient([
        { type: 'token', text: 'thinking. ' },
        { type: 'tool_call', id: 'c1', name: 'lookup', args: { q: 'x' } },
        { type: 'tool_result', callId: 'c1', ok: true, output: '{"hit":1}', outputLang: 'json' },
        { type: 'token', text: 'done.' },
        { type: 'done' },
      ]),
    )

    await useChatStore.getState().send('go')
    const roles = useChatStore.getState().messages.map((m) => m.role)

    expect(roles).toEqual(['user', 'assistant', 'tool_call', 'tool_result', 'assistant'])
    const assistantContents = useChatStore
      .getState()
      .messages.flatMap((m) => (m.role === 'assistant' ? [m.content] : []))
    expect(assistantContents).toEqual(['thinking. ', 'done.'])
  })

  test('error event flips status and stops the stream', async () => {
    setClient(
      new TestClient([
        { type: 'token', text: 'partial' },
        { type: 'error', message: 'boom' },
        { type: 'token', text: 'should-not-appear' },
      ]),
    )

    await useChatStore.getState().send('go')
    const { status, error, messages } = useChatStore.getState()

    expect(status).toBe('error')
    expect(error).toBe('boom')
    const assistant = messages.find((m) => m.role === 'assistant')
    expect(assistant && 'content' in assistant ? assistant.content : '').toBe('partial')
  })

  test('forwards prior turns as history but excludes the new user msg', async () => {
    const first = new TestClient([{ type: 'token', text: 'reply' }, { type: 'done' }])
    setClient(first)
    await useChatStore.getState().send('first')

    const second = new TestClient([{ type: 'done' }])
    setClient(second)
    await useChatStore.getState().send('second')

    expect(first.lastHistory).toEqual([])
    expect(second.lastHistory).toEqual([
      { role: 'user', text: 'first' },
      { role: 'assistant', text: 'reply' },
    ])
  })

  test('history filters out empty content, system, tool_call, and tool_result messages', async () => {
    useChatStore.setState({
      messages: [
        { id: '1', role: 'user', content: 'hi', ts: 0 },
        { id: '2', role: 'assistant', content: '', ts: 0 },
        { id: '3', role: 'system', content: 'event', ts: 0 },
        { id: '4', role: 'tool_call', name: 'x', args: {}, ts: 0 },
        { id: '5', role: 'tool_result', callId: 'x', ok: true, output: '{}', ts: 0 },
        { id: '6', role: 'assistant', content: 'kept', ts: 0 },
      ],
    })
    const client = new TestClient([{ type: 'done' }])
    setClient(client)

    await useChatStore.getState().send('go')

    expect(client.lastHistory).toEqual([
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'kept' },
    ])
  })

  test('clear empties messages and resets status', () => {
    useChatStore.setState({
      messages: [{ id: '1', role: 'user', content: 'hi', ts: 0 }],
      status: 'streaming',
      error: 'x',
    })
    useChatStore.getState().clear()

    expect(useChatStore.getState()).toMatchObject({
      messages: [],
      status: 'idle',
      error: undefined,
    })
  })

  test('cancel aborts an in-flight stream and flips to idle', async () => {
    let aborted = false
    setClient({
      async *send(_text, signal) {
        signal.addEventListener('abort', () => {
          aborted = true
        })
        yield { type: 'token', text: 'a' }
        await new Promise((resolve) => setTimeout(resolve, 50))
        yield { type: 'token', text: 'b' }
      },
    })

    const sendPromise = useChatStore.getState().send('go')
    await new Promise((resolve) => setTimeout(resolve, 5))
    useChatStore.getState().cancel()
    await sendPromise

    expect(aborted).toBe(true)
    expect(useChatStore.getState().status).toBe('idle')
  })
})
