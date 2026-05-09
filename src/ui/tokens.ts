/**
 * Pinned palette. No theming — change here, change everywhere.
 * Modeled on GitHub Dark, with role assignments mirroring opencode's
 * markdown spacing/contrast conventions.
 */
export const PALETTE = {
  textStrong: '#E6EDF3',
  textBase: '#C9D1D9',
  textWeak: '#8B949E',
  textDim: '#6E7681',

  accent: '#58A6FF',
  accentAlt: '#79C0FF',
  accentPurple: '#A78BFA',

  surfaceBase: '#0D1117',
  surfaceElevated: '#161B22',
  surfaceHighlight: '#1C2128',

  borderWeak: '#30363D',
  borderStrong: '#484F58',

  ok: '#3FB950',
  err: '#F85149',
  warn: '#FFA657',

  toolBullet: '#FFA657',
  toolName: '#D2A8FF',

  syntax: {
    keyword: '#FF7B72',
    string: '#A5D6FF',
    comment: '#8B949E',
    number: '#79C0FF',
    function: '#D2A8FF',
    type: '#FFA657',
    property: '#79C0FF',
    operator: '#FF7B72',
    punctuation: '#C9D1D9',
  },
} as const
