import { BoxRenderable, type RenderNodeContext, TextAttributes } from '@opentui/core'
import { isObject, isString, truncate as ldTruncate, map } from 'lodash'
import type { Token } from 'marked'
import type { Message as MessageType } from '../state/types'
import { syntaxStyle } from '../ui/syntax-style'
import { PALETTE } from '../ui/tokens'

const renderBlock = (token: Token, ctx: RenderNodeContext) => {
  if (token.type === 'code') {
    if (!('text' in token) || !token.text?.trim()) return null
    const inner = ctx.defaultRender()
    if (!inner) return undefined
    const wrapper = new BoxRenderable(inner.ctx, {
      border: ['left'],
      borderColor: PALETTE.accentPurple,
      backgroundColor: PALETTE.surfaceElevated,
      paddingLeft: 2,
      paddingRight: 1,
      marginTop: 1,
      marginBottom: 1,
      width: '100%',
      flexDirection: 'column',
    })
    wrapper.add(inner)
    return wrapper
  }

  if (token.type === 'blockquote') {
    const inner = ctx.defaultRender()
    if (!inner) return undefined
    const wrapper = new BoxRenderable(inner.ctx, {
      border: ['left'],
      borderColor: PALETTE.borderWeak,
      paddingLeft: 1,
      marginTop: 1,
      marginBottom: 1,
      width: '100%',
      flexDirection: 'column',
    })
    wrapper.add(inner)
    return wrapper
  }

  if (token.type === 'heading') {
    const inner = ctx.defaultRender()
    if (!inner) return undefined
    const wrapper = new BoxRenderable(inner.ctx, {
      marginTop: 1,
      marginBottom: 1,
      flexDirection: 'column',
    })
    wrapper.add(inner)
    return wrapper
  }

  return undefined
}

type Props = { message: MessageType; isStreaming?: boolean }

export function Message({ message, isStreaming }: Props) {
  if (message.role === 'user') {
    return (
      <box
        style={{
          flexDirection: 'row',
          backgroundColor: PALETTE.surfaceHighlight,
          paddingLeft: 1,
          paddingRight: 1,
          marginTop: 1,
        }}
      >
        <text fg={PALETTE.accent}>{'> '}</text>
        <text fg={PALETTE.textStrong}>{message.content}</text>
      </box>
    )
  }

  if (message.role === 'system') {
    return (
      <box style={{ flexDirection: 'row', paddingLeft: 1, marginTop: 1 }}>
        <text fg={PALETTE.textDim}>⋯ {message.content}</text>
      </box>
    )
  }

  if (message.role === 'tool_call') {
    return (
      <box style={{ flexDirection: 'row', paddingLeft: 1, marginTop: 1 }}>
        <text fg={PALETTE.toolBullet}>● </text>
        <text fg={PALETTE.toolName} attributes={TextAttributes.BOLD}>
          {message.name}
        </text>
        <text fg={PALETTE.textWeak}>({summarizeArgs(message.args)})</text>
      </box>
    )
  }

  if (message.role === 'tool_result') {
    const accent = message.ok ? PALETTE.ok : PALETTE.err
    return (
      <box style={{ flexDirection: 'row', paddingLeft: 3 }}>
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
        renderNode={renderBlock}
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
