import { useCallback, useState } from 'react'
import { useKeyboard } from '@opentui/react'
import { useAuthStore } from '../state/auth-store'

export function LoginScreen() {
  const [authId, setAuthId] = useState('')
  const [token, setToken] = useState('')
  const [focused, setFocused] = useState<'authId' | 'token'>('authId')
  const login = useAuthStore((s) => s.login)

  useKeyboard((key) => {
    if (key.name === 'tab') {
      setFocused((prev) => (prev === 'authId' ? 'token' : 'authId'))
    }
  })

  const handleSubmit = useCallback(() => {
    if (authId.trim() && token.trim()) {
      login({ authId: authId.trim(), token: token.trim() })
    }
  }, [authId, token, login])

  return (
    <box style={{ flexDirection: 'column', alignItems: 'center', gap: 1, padding: 2 }}>
      <ascii-font text="PLIVO" font="block" color="#5C6BC0" />

      <box style={{ border: true, padding: 2, flexDirection: 'column', gap: 1 }}>
        <text fg="#FFFF00">Debugger — Login</text>

        <box title="Auth ID" style={{ border: true, width: 60, height: 3 }}>
          <input
            placeholder="Plivo Auth ID"
            onInput={setAuthId}
            onSubmit={() => setFocused('token')}
            focused={focused === 'authId'}
          />
        </box>

        <box title="Auth Token" style={{ border: true, width: 60, height: 3 }}>
          <input
            placeholder="Plivo Auth Token"
            onInput={setToken}
            onSubmit={handleSubmit}
            focused={focused === 'token'}
          />
        </box>

        <text fg="#888">Tab to switch fields. Enter on Token to login.</text>
      </box>
    </box>
  )
}
