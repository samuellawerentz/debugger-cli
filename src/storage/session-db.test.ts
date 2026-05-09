import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SessionDb } from './session-db'

let tempDir: string | null = null

const createTestDb = () => {
  tempDir = mkdtempSync(join(tmpdir(), 'debugger-cli-'))
  return new SessionDb(join(tempDir, 'debugger.sqlite'))
}

afterEach(() => {
  if (!tempDir) return
  rmSync(tempDir, { recursive: true, force: true })
  tempDir = null
})

describe('SessionDb', () => {
  test('stores sessions by auth id in recent order', () => {
    const db = createTestDb()

    db.createSession({ id: 'older', authId: 'MA123', title: 'Older', now: 100 })
    db.createSession({ id: 'newer', authId: 'MA123', title: 'Newer', now: 200 })
    db.createSession({ id: 'other-account', authId: 'MA999', title: 'Other', now: 300 })

    expect(db.listSessions('MA123').map((session) => session.id)).toEqual(['newer', 'older'])

    db.close()
  })

  test('stores console-style turns with nested tool calls and sources', () => {
    const db = createTestDb()
    const session = db.createSession({
      id: 'session-1',
      authId: 'MA123',
      title: 'Debug call',
      now: 100,
    })

    db.createTurn({
      id: 'turn-user',
      sessionId: session.id,
      role: 'user',
      content: 'Why did this call fail?',
      now: 101,
    })

    db.createTurn({
      id: 'turn-assistant',
      sessionId: session.id,
      role: 'assistant',
      content: 'Checking logs...',
      status: 'streaming',
      toolCalls: [
        { id: 'tool-1', name: 'fetch_logs', input: { callUuid: 'abc' }, status: 'running' },
      ],
      now: 102,
    })

    db.updateTurn('turn-assistant', {
      content: 'The call failed because the destination was unreachable.',
      status: 'complete',
      sources: [{ id: 'log-1', title: 'Call logs', metadata: { status: 'failed' } }],
      toolCalls: [
        {
          id: 'tool-1',
          name: 'fetch_logs',
          input: { callUuid: 'abc' },
          output: { status: 'failed' },
          status: 'complete',
        },
      ],
      now: 103,
    })

    expect(db.listTurns(session.id)).toEqual([
      expect.objectContaining({
        id: 'turn-user',
        role: 'user',
        content: 'Why did this call fail?',
      }),
      expect.objectContaining({
        id: 'turn-assistant',
        role: 'assistant',
        status: 'complete',
        content: 'The call failed because the destination was unreachable.',
        sources: [{ id: 'log-1', title: 'Call logs', metadata: { status: 'failed' } }],
        toolCalls: [
          {
            id: 'tool-1',
            name: 'fetch_logs',
            input: { callUuid: 'abc' },
            output: { status: 'failed' },
            status: 'complete',
          },
        ],
      }),
    ])
    expect(db.getSession(session.id)?.updatedAt).toBe(103)

    db.close()
  })
})
