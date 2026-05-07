import { useCallback, useState } from 'react'
import { useKeyboard } from '@opentui/react'
import { useAuthStore } from '../state/auth-store'

export function LoginScreen() {
  const [baseUrl, setBaseUrl] = useState('')
  const [token, setToken] = useState('')
  const [focused, setFocused] = useState<'baseUrl' | 'token'>('baseUrl')
  const login = useAuthStore((s) => s.login)

  useKeyboard((key) => {
    if (key.name === 'tab') {
      setFocused((prev) => (prev === 'baseUrl' ? 'token' : 'baseUrl'))
    }
  })

  const handleSubmit = useCallback(() => {
    if (baseUrl.trim() && token.trim()) {
      login({ baseUrl: baseUrl.trim(), token: token.trim() })
    }
  }, [baseUrl, token, login])

  return (
    <box style={{ border: true, padding: 2, flexDirection: 'column', gap: 1 }}>
      <text fg="#FFFF00">Plivo Debugger — Login</text>

      <box title="Base URL" style={{ border: true, width: 60, height: 3 }}>
        <input
          placeholder="https://api.example.com"
          onInput={setBaseUrl}
          onSubmit={() => setFocused('token')}
          focused={focused === 'baseUrl'}
        />
      </box>

      <box title="Token" style={{ border: true, width: 60, height: 3 }}>
        <input
          placeholder="Bearer token..."
          onInput={setToken}
          onSubmit={handleSubmit}
          focused={focused === 'token'}
        />
      </box>

      <text fg="#888">Tab to switch fields. Enter on Token to login.</text>
    </box>
  )
}
