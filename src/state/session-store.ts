import { truncate } from 'lodash'
import { create } from 'zustand'
import { SessionDb, type SessionRecord } from '../storage/session-db'

const db = new SessionDb()

type SessionState = {
  sessions: SessionRecord[]
  activeSessionId: string | null
  selectedIndex: number
  load: (authId: string) => void
  createSession: (authId: string) => SessionRecord
  selectSession: (id: string) => void
  clearActiveSession: () => void
  move: (delta: number) => void
}

const titleFromDate = () =>
  truncate(`Session ${new Date().toLocaleString()}`, { length: 48, omission: '...' })

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  selectedIndex: 0,

  load(authId) {
    const sessions = db.listSessions(authId)
    set((state) => ({
      sessions,
      selectedIndex: Math.min(state.selectedIndex, Math.max(0, sessions.length - 1)),
    }))
  },

  createSession(authId) {
    const session = db.createSession({ authId, title: titleFromDate() })
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
      selectedIndex: 0,
    }))
    return session
  },

  selectSession(id) {
    set({ activeSessionId: id })
  },

  clearActiveSession() {
    set({ activeSessionId: null })
  },

  move(delta) {
    const count = get().sessions.length + 1
    if (count <= 0) return
    set((state) => ({ selectedIndex: (state.selectedIndex + delta + count) % count }))
  },
}))
