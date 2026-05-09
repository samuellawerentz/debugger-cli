import { Database } from 'bun:sqlite'
import { chmodSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { v4 as uuid } from 'uuid'

export type SessionRecord = {
  id: string
  authId: string
  title: string
  createdAt: number
  updatedAt: number
  archivedAt: number | null
}

export type TurnRole = 'user' | 'assistant'
export type TurnStatus = 'pending' | 'streaming' | 'complete' | 'error'

export type TurnSource = {
  id: string
  title?: string
  url?: string
  metadata?: Record<string, unknown>
}

export type TurnToolCall = {
  id: string
  name: string
  input?: unknown
  output?: unknown
  status: 'running' | 'complete' | 'error'
  error?: string
}

export type TurnAttachment = {
  mediaType: string
  filename?: string
  url: string
}

export type TurnRecord = {
  id: string
  sessionId: string
  role: TurnRole
  content: string
  status: TurnStatus
  sources: TurnSource[]
  toolCalls: TurnToolCall[]
  attachments: TurnAttachment[]
  error: string | null
  createdAt: number
  updatedAt: number
}

type SessionRow = {
  id: string
  auth_id: string
  title: string
  created_at: number
  updated_at: number
  archived_at: number | null
}

type TurnRow = {
  id: string
  session_id: string
  role: TurnRole
  content: string
  status: TurnStatus
  sources_json: string
  tool_calls_json: string
  attachments_json: string
  error: string | null
  created_at: number
  updated_at: number
}

type CreateSessionInput = {
  authId: string
  title?: string
  id?: string
  now?: number
}

type CreateTurnInput = {
  sessionId: string
  role: TurnRole
  content?: string
  status?: TurnStatus
  sources?: TurnSource[]
  toolCalls?: TurnToolCall[]
  attachments?: TurnAttachment[]
  error?: string | null
  id?: string
  now?: number
}

type UpdateTurnInput = Partial<
  Pick<TurnRecord, 'content' | 'status' | 'sources' | 'toolCalls' | 'attachments' | 'error'>
> & {
  now?: number
}

export const getDefaultSessionDbPath = () =>
  join(
    process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share'),
    'plivo-debugger',
    'debugger.sqlite',
  )

const parseJsonArray = <T>(value: string): T[] => {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

const toSessionRecord = (row: SessionRow): SessionRecord => ({
  id: row.id,
  authId: row.auth_id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
})

const toTurnRecord = (row: TurnRow): TurnRecord => ({
  id: row.id,
  sessionId: row.session_id,
  role: row.role,
  content: row.content,
  status: row.status,
  sources: parseJsonArray<TurnSource>(row.sources_json),
  toolCalls: parseJsonArray<TurnToolCall>(row.tool_calls_json),
  attachments: parseJsonArray<TurnAttachment>(row.attachments_json),
  error: row.error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export class SessionDb {
  private db: Database

  constructor(path = getDefaultSessionDbPath()) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new Database(path)
    this.db.exec('pragma foreign_keys = on')
    this.db.exec(`
      create table if not exists sessions (
        id text primary key,
        auth_id text not null,
        title text not null,
        created_at integer not null,
        updated_at integer not null,
        archived_at integer
      );

      create table if not exists turns (
        id text primary key,
        session_id text not null references sessions(id) on delete cascade,
        role text not null,
        content text not null default '',
        status text not null,
        sources_json text not null default '[]',
        tool_calls_json text not null default '[]',
        attachments_json text not null default '[]',
        error text,
        created_at integer not null,
        updated_at integer not null
      );

      create index if not exists sessions_auth_updated_idx
        on sessions(auth_id, updated_at desc);

      create index if not exists turns_session_created_idx
        on turns(session_id, created_at asc);
    `)
    chmodSync(path, 0o600)
  }

  close(): void {
    this.db.close()
  }

  createSession(input: CreateSessionInput): SessionRecord {
    const now = input.now ?? Date.now()
    const record: SessionRecord = {
      id: input.id ?? uuid(),
      authId: input.authId,
      title: input.title ?? 'New session',
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    }

    this.db
      .query(
        `insert into sessions (id, auth_id, title, created_at, updated_at, archived_at)
         values (?, ?, ?, ?, ?, ?)`,
      )
      .run(record.id, record.authId, record.title, record.createdAt, record.updatedAt, null)

    return record
  }

  listSessions(authId: string): SessionRecord[] {
    return this.db
      .query<SessionRow, [string]>(
        `select * from sessions
         where auth_id = ? and archived_at is null
         order by updated_at desc`,
      )
      .all(authId)
      .map(toSessionRecord)
  }

  getSession(id: string): SessionRecord | null {
    const row = this.db.query<SessionRow, [string]>('select * from sessions where id = ?').get(id)
    return row ? toSessionRecord(row) : null
  }

  renameSession(id: string, title: string, now = Date.now()): void {
    this.db.query('update sessions set title = ?, updated_at = ? where id = ?').run(title, now, id)
  }

  archiveSession(id: string, now = Date.now()): void {
    this.db
      .query('update sessions set archived_at = ?, updated_at = ? where id = ?')
      .run(now, now, id)
  }

  createTurn(input: CreateTurnInput): TurnRecord {
    const now = input.now ?? Date.now()
    const record: TurnRecord = {
      id: input.id ?? uuid(),
      sessionId: input.sessionId,
      role: input.role,
      content: input.content ?? '',
      status: input.status ?? 'complete',
      sources: input.sources ?? [],
      toolCalls: input.toolCalls ?? [],
      attachments: input.attachments ?? [],
      error: input.error ?? null,
      createdAt: now,
      updatedAt: now,
    }

    this.db
      .query(
        `insert into turns (
          id, session_id, role, content, status, sources_json, tool_calls_json,
          attachments_json, error, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.sessionId,
        record.role,
        record.content,
        record.status,
        JSON.stringify(record.sources),
        JSON.stringify(record.toolCalls),
        JSON.stringify(record.attachments),
        record.error,
        record.createdAt,
        record.updatedAt,
      )

    this.touchSession(record.sessionId, now)
    return record
  }

  updateTurn(id: string, input: UpdateTurnInput): TurnRecord | null {
    const existing = this.getTurn(id)
    if (!existing) return null

    const updated: TurnRecord = {
      ...existing,
      content: input.content ?? existing.content,
      status: input.status ?? existing.status,
      sources: input.sources ?? existing.sources,
      toolCalls: input.toolCalls ?? existing.toolCalls,
      attachments: input.attachments ?? existing.attachments,
      error: input.error === undefined ? existing.error : input.error,
      updatedAt: input.now ?? Date.now(),
    }

    this.db
      .query(
        `update turns
         set content = ?, status = ?, sources_json = ?, tool_calls_json = ?,
             attachments_json = ?, error = ?, updated_at = ?
         where id = ?`,
      )
      .run(
        updated.content,
        updated.status,
        JSON.stringify(updated.sources),
        JSON.stringify(updated.toolCalls),
        JSON.stringify(updated.attachments),
        updated.error,
        updated.updatedAt,
        updated.id,
      )

    this.touchSession(updated.sessionId, updated.updatedAt)
    return updated
  }

  getTurn(id: string): TurnRecord | null {
    const row = this.db.query<TurnRow, [string]>('select * from turns where id = ?').get(id)
    return row ? toTurnRecord(row) : null
  }

  listTurns(sessionId: string): TurnRecord[] {
    return this.db
      .query<TurnRow, [string]>(
        `select * from turns
         where session_id = ?
         order by created_at asc`,
      )
      .all(sessionId)
      .map(toTurnRecord)
  }

  private touchSession(id: string, now: number): void {
    this.db.query('update sessions set updated_at = ? where id = ?').run(now, id)
  }
}
