# Plivo Debugger TUI - Plan

Bun + TypeScript + @opentui/react + zustand. v0 = login + single chat view streaming SSE (stubbed).

## Folder structure

```
debugger-cli/
  package.json
  tsconfig.json
  src/
    index.tsx                # entry: load config, mount <App/>
    app.tsx                  # root: route Login vs Chat from store
    config/
      store.ts               # read/write ~/.config/plivo-debugger/config.json (0600)
      schema.ts              # Config = { baseUrl, token }
    state/
      auth-store.ts          # zustand: { baseUrl, token, login, logout, hydrate }
      chat-store.ts          # zustand: { messages, status, send, cancel, clear }
      types.ts               # Message, ChatStatus, ChatEvent
    auth/
      login-screen.tsx       # baseUrl + token inputs, calls auth.login()
    chat/
      chat-screen.tsx        # layout shell
      message-list.tsx       # scrollbox bound to chat-store.messages
      message.tsx            # one row (user/assistant/system/event)
      composer.tsx           # <input>, on submit -> chat-store.send()
    api/
      client.ts              # ChatClient interface
      sse-client.ts          # real impl (fetch + SSE line parser, Bearer auth)
      stub-client.ts         # fake streaming tokens for v0
    ui/
      status-bar.tsx         # connection, baseUrl, hotkeys
      keymap.ts              # central bindings
  README.md
```

## State (zustand)

- `auth-store`
  - state: `baseUrl`, `token`, `hydrated`
  - actions: `hydrate()` (read config file on boot), `login({baseUrl, token})` (persist + set), `logout()` (clear file + state)
- `chat-store`
  - state: `messages: Message[]`, `status: 'idle'|'streaming'|'error'`, `error?`, `abort?: AbortController`
  - actions: `send(text)` (push user msg, open stream via injected `ChatClient`, mutate assistant msg as tokens arrive), `cancel()`, `clear()`
- Client injection: `chat-store` reads a module-level `getClient()` that returns `StubClient` for v0; swap to `SseClient` later without touching components.

## Architecture

- Single Bun process. `createCliRenderer` + `createRoot` from `@opentui/react`.
- Boot order: `auth.hydrate()` -> if no token, render `<LoginScreen/>`; else `<ChatScreen/>`. App subscribes to `auth-store` for routing.
- `ChatClient` interface:
  ```ts
  interface ChatClient {
    send(text: string, signal: AbortSignal): AsyncIterable<ChatEvent>
  }
  ```
  `ChatEvent` = `{ type: 'token', text } | { type: 'event', payload } | { type: 'error', message } | { type: 'done' }`.
- SSE impl: native `fetch` (Bun), `Authorization: Bearer <token>`, line-buffered parser, yield events.
- Layout: vertical flex - `MessageList` (flex:1, scrollbox, auto-scroll on append) + `Composer` (h:3, bordered input) + `StatusBar` (h:1).
- Keymap: `Ctrl+C` quit, `Esc` cancel in-flight, `Ctrl+L` clear, `Ctrl+K` logout.

## v0 deliverable

1. Bun init, deps (`@opentui/core`, `@opentui/react`, `react`, `zustand`), tsconfig with `jsxImportSource: "@opentui/react"`.
2. Config file store (read/write `~/.config/plivo-debugger/config.json`, mode 0600).
3. `auth-store` + `<LoginScreen/>`.
4. `chat-store` wired to `StubClient` that streams fake tokens - proves end-to-end pipeline.
5. `<ChatScreen/>` + `<StatusBar/>` + keymap.

Real SSE = swap `StubClient` -> `SseClient` once endpoint spec lands. No component changes.
