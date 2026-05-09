import { useKeyboard } from '@opentui/react'
import { useEffect } from 'react'
import { useAuthStore } from '../state/auth-store'
import { useChatStore } from '../state/chat-store'
import { useSessionStore } from '../state/session-store'

const formatDate = (value: number) => new Date(value).toLocaleString()

export function SessionHomeScreen() {
  const authId = useAuthStore((s) => s.authId)
  const logout = useAuthStore((s) => s.logout)
  const sessions = useSessionStore((s) => s.sessions)
  const selectedIndex = useSessionStore((s) => s.selectedIndex)
  const load = useSessionStore((s) => s.load)
  const createSession = useSessionStore((s) => s.createSession)
  const selectSession = useSessionStore((s) => s.selectSession)
  const move = useSessionStore((s) => s.move)
  const loadSession = useChatStore((s) => s.loadSession)

  const openNewSession = () => {
    const session = createSession(authId)
    loadSession(session.id)
  }

  const openSession = (id: string) => {
    loadSession(id)
    selectSession(id)
  }

  useEffect(() => {
    load(authId)
  }, [authId, load])

  useKeyboard((key) => {
    if (key.name === 'down' || (key.ctrl && key.name === 'j')) move(1)
    else if (key.name === 'up' || (key.ctrl && key.name === 'k')) move(-1)
    else if (key.ctrl && key.name === 'n') openNewSession()
    else if (key.ctrl && key.name === 'o') logout()
    else if (key.name === 'return') {
      if (selectedIndex === 0) openNewSession()
      else {
        const session = sessions[selectedIndex - 1]
        if (session) openSession(session.id)
      }
    }
  })

  return (
    <box style={{ flexDirection: 'column', flexGrow: 1, padding: 2, gap: 1 }}>
      <box style={{ alignItems: 'center', flexDirection: 'column' }}>
        <ascii-font text="PLIVO" font="block" color="#5C6BC0" />
        <text fg="#888">{authId}</text>
      </box>

      <box
        title="Sessions"
        style={{ border: true, flexDirection: 'column', flexGrow: 1, padding: 1 }}
      >
        <SessionRow
          selected={selectedIndex === 0}
          title="New session"
          subtitle="Start a fresh Buddy chat"
        />

        {sessions.length === 0 ? (
          <text fg="#666">No previous sessions yet.</text>
        ) : (
          sessions.map((session, index) => (
            <SessionRow
              key={session.id}
              selected={selectedIndex === index + 1}
              title={session.title}
              subtitle={`Updated ${formatDate(session.updatedAt)}`}
            />
          ))
        )}
      </box>

      <text fg="#888">Enter open · Ctrl+N new · ↑/↓ or Ctrl+J/K move · Ctrl+O logout</text>
    </box>
  )
}

function SessionRow({
  selected,
  title,
  subtitle,
}: {
  selected: boolean
  title: string
  subtitle: string
}) {
  return (
    <box style={{ flexDirection: 'column', paddingLeft: 1, paddingRight: 1 }}>
      <text fg={selected ? '#000' : '#ddd'} bg={selected ? '#7ad' : undefined}>
        {(selected ? '▶ ' : '  ') + title}
      </text>
      <text fg="#777"> {subtitle}</text>
    </box>
  )
}
