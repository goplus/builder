import * as color from './colors'

export { color }

export const fontSize = {
  // TODO: more font-related vars
  text: '14px'
} as const

export const fontFamily = {
  // see definition for `AlibabaHealthB` in global.scss
  main: `AlibabaHealthB,
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  Roboto,
  'Helvetica Neue',
  Arial,
  'Noto Sans',
  sans-serif,
  'Apple Color Emoji',
  'Segoe UI Emoji',
  'Segoe UI Symbol',
  'Noto Color Emoji'`,
  code: '"JetBrains Mono NL", Consolas, "Courier New", monospace'
}

export const borderRadius = {
  1: '8px',
  2: '12px',
  3: '20px'
} as const

export const boxShadow = {
  small: '0px 2px 8px 0px rgba(51, 51, 51, 0.08)',
  big: '0px 4px 24px 0px rgba(36, 41, 47, 0.08)',
  diffusion: '0px 4px 12px 0px #D0F2F8'
} as const

export const lineHeight = {
  1: '26px',
  2: '32px',
  3: '40px'
} as const

export const gap = {
  middle: '16px',
  large: '24px'
  // TODO: other gap defs
} as const
