import { useKeyboard } from '@opentui/react'
import { useAuthStore } from '../state/auth-store'
import { useChatStore } from '../state/chat-store'
import { useUIStore } from './ui-store'

const KEYBINDINGS: Array<[string, string]> = [
  ['Ctrl+P', 'Open command palette'],
  ['Ctrl+C', 'Quit'],
  ['Esc', 'Cancel / close palette'],
  ['Ctrl+L', 'Clear chat'],
  ['Ctrl+J / Ctrl+K', 'Scroll down / up'],
  ['Ctrl+D / Ctrl+U', 'Half-page down / up'],
]

type Action = { label: string; run: () => void }

export function Palette() {
  const open = useUIStore((s) => s.paletteOpen)
  const view = useUIStore((s) => s.view)
  const selected = useUIStore((s) => s.selectedIndex)
  const setView = useUIStore((s) => s.setView)
  const close = useUIStore((s) => s.close)
  const move = useUIStore((s) => s.move)
  const logout = useAuthStore((s) => s.logout)
  const clear = useChatStore((s) => s.clear)

  const actions: Action[] = [
    { label: 'Keybindings', run: () => setView('keybindings') },
    {
      label: 'Clear session',
      run: () => {
        clear()
        close()
      },
    },
    {
      label: 'Logout',
      run: () => {
        logout()
        close()
      },
    },
  ]

  useKeyboard((key) => {
    if (!open) return
    if (key.name === 'escape') {
      if (view === 'keybindings') setView('menu')
      else close()
      return
    }
    if (view !== 'menu') return
    if (key.ctrl && key.name === 'j') move(1, actions.length)
    else if (key.ctrl && key.name === 'k') move(-1, actions.length)
    else if (key.name === 'down') move(1, actions.length)
    else if (key.name === 'up') move(-1, actions.length)
    else if (key.name === 'return') actions[selected]?.run()
  })

  if (!open) return null

  return (
    <box
      style={{
        position: 'absolute',
        top: 2,
        left: 4,
        right: 4,
        border: true,
        backgroundColor: '#000',
        flexDirection: 'column',
        paddingLeft: 1,
        paddingRight: 1,
      }}
      title={view === 'menu' ? 'Command Palette' : 'Keybindings'}
    >
      {view === 'menu'
        ? actions.map((a, i) => (
            <text
              key={a.label}
              fg={i === selected ? '#000' : '#ccc'}
              bg={i === selected ? '#7ad' : undefined}
            >
              {(i === selected ? '▶ ' : '  ') + a.label}
            </text>
          ))
        : KEYBINDINGS.map(([k, desc]) => (
            <box key={k} style={{ flexDirection: 'row' }}>
              <text fg="#7ad" attributes={1}>
                {k.padEnd(20)}
              </text>
              <text fg="#ccc">{desc}</text>
            </box>
          ))}
      <text fg="#666">
        {view === 'menu'
          ? '─ Ctrl+J/K or ↑/↓ to move · Enter to select · Esc to close ─'
          : '─ Esc to go back ─'}
      </text>
    </box>
  )
}
