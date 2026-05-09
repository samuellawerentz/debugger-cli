import { RGBA, SyntaxStyle } from '@opentui/core'
import { PALETTE } from './tokens'

const c = (hex: string) => RGBA.fromHex(hex)

export const syntaxStyle = SyntaxStyle.fromStyles({
  // markdown
  'markup.heading': { fg: c(PALETTE.textStrong), bold: true },
  'markup.heading.1': { fg: c(PALETTE.accent), bold: true },
  'markup.heading.2': { fg: c(PALETTE.accentAlt), bold: true },
  'markup.heading.3': { fg: c(PALETTE.textStrong), bold: true },
  'markup.heading.4': { fg: c(PALETTE.textBase), bold: true },
  'markup.heading.5': { fg: c(PALETTE.textWeak), bold: true },
  'markup.heading.6': { fg: c(PALETTE.textDim), bold: true },
  'markup.bold': { fg: c(PALETTE.textStrong), bold: true },
  'markup.strong': { fg: c(PALETTE.textStrong), bold: true },
  'markup.italic': { fg: c(PALETTE.textBase), italic: true },
  'markup.list': { fg: c(PALETTE.syntax.keyword) },
  'markup.quote': { fg: c(PALETTE.textWeak), italic: true },
  'markup.raw': { fg: c(PALETTE.syntax.string) },
  'markup.raw.block': { fg: c(PALETTE.syntax.string) },
  'markup.link': { fg: c(PALETTE.accent), underline: true },
  'markup.link.url': { fg: c(PALETTE.accent), underline: true },

  // code
  keyword: { fg: c(PALETTE.syntax.keyword), bold: true },
  string: { fg: c(PALETTE.syntax.string) },
  comment: { fg: c(PALETTE.syntax.comment), italic: true },
  number: { fg: c(PALETTE.syntax.number) },
  boolean: { fg: c(PALETTE.syntax.number) },
  constant: { fg: c(PALETTE.syntax.number) },
  function: { fg: c(PALETTE.syntax.function) },
  'function.call': { fg: c(PALETTE.syntax.function) },
  type: { fg: c(PALETTE.syntax.type) },
  variable: { fg: c(PALETTE.textStrong) },
  property: { fg: c(PALETTE.syntax.property) },
  operator: { fg: c(PALETTE.syntax.operator) },
  punctuation: { fg: c(PALETTE.syntax.punctuation) },

  default: { fg: c(PALETTE.textStrong) },
})
