import { BoxRenderable, type RenderNodeContext, TextAttributes } from '@opentui/core'
import { isObject, isString, truncate as ldTruncate, map } from 'lodash'
import type { Token } from 'marked'
import type { Message as MessageType } from '../state/types'
import { syntaxStyle } from '../ui/syntax-style'

const renderCodeBlock = (token: Token, ctx: RenderNodeContext) => {
  if (token.type !== 'code') return undefined
  const inner = ctx.defaultRender()
  if (!inner) return undefined
  const wrapper = new BoxRenderable(inner.ctx, {
    border: ['left'],
    borderColor: '#A78BFA',
    backgroundColor: '#161b22',
    paddingLeft: 2,
    paddingRight: 1,
    paddingTop: 1,
    paddingBottom: 1,
    marginTop: 1,
    marginBottom: 1,
    width: '100%',
    flexDirection: 'column',
  })
  wrapper.add(inner)
  return wrapper
}

type Props = { message: MessageType; isStreaming?: boolean }

export function Message({ message, isStreaming }: Props) {
  if (message.role === 'user') {
    return (
      <box
        style={{
          flexDirection: 'row',
          backgroundColor: '#1c2128',
          paddingLeft: 1,
          paddingRight: 1,
          marginTop: 1,
        }}
      >
        <text fg="#58A6FF">{'> '}</text>
        <text fg="#E6EDF3">{message.content}</text>
      </box>
    )
  }

  if (message.role === 'system') {
    return (
      <box style={{ flexDirection: 'row', paddingLeft: 1, marginTop: 1 }}>
        <text fg="#6e7681">⋯ {message.content}</text>
      </box>
    )
  }

  if (message.role === 'tool_call') {
    return (
      <box style={{ flexDirection: 'row', paddingLeft: 1, marginTop: 1 }}>
        <text fg="#FFA657">● </text>
        <text fg="#D2A8FF" attributes={TextAttributes.BOLD}>
          {message.name}
        </text>
        <text fg="#8B949E">({summarizeArgs(message.args)})</text>
      </box>
    )
  }

  if (message.role === 'tool_result') {
    const accent = message.ok ? '#3FB950' : '#F85149'
    return (
      <box style={{ flexDirection: 'row', paddingLeft: 3, marginTop: 0 }}>
        <text fg={accent}>{message.ok ? '└ ' : '└ ✗ '}</text>
        <code
          content={truncate(message.output, 800)}
          filetype={message.outputLang ?? 'markdown'}
          syntaxStyle={syntaxStyle}
        />
      </box>
    )
  }

  return (
    <box style={{ flexDirection: 'column', paddingLeft: 1, paddingRight: 1, marginTop: 1 }}>
      <markdown
        content={message.content || (isStreaming ? '…' : '')}
        syntaxStyle={syntaxStyle}
        streaming={!!isStreaming}
        conceal
        renderNode={renderCodeBlock}
      />
    </box>
  )
}

function summarizeArgs(args: unknown): string {
  if (args == null) return ''
  if (isString(args)) return JSON.stringify(args)
  if (!isObject(args)) return String(args)
  return map(args as Record<string, unknown>, (v, k) => `${k}: ${shortValue(v)}`).join(', ')
}

function shortValue(v: unknown): string {
  if (isString(v)) return JSON.stringify(ldTruncate(v, { length: 40 }))
  if (v == null || !isObject(v)) return String(v)
  return '…'
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  const extraLines = s.slice(n).split('\n').length
  return `${s.slice(0, n)}\n… +${extraLines} lines`
}
