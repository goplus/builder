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
  code: 'Menlo, Monaco, "Courier New", monospace'
}

export const radius = {
  1: '4px',
  2: '8px',
  3: '10px',
  4: '12px',
  full: '100px'
} as const

export const borderRadius = {
  1: '8px',
  2: '12px',
  3: '20px'
} as const

export const boxShadow = {
  panel: '0px 6px 16px 0px rgba(36, 41, 47, 0.05)',
  surface: '0px 4px 12px 0px rgba(36, 41, 47, 0.08)',
  surfaceStrong: '0px 8px 24px 8px rgba(36, 41, 47, 0.05)',
  accent: '0px 4px 12px 0px rgba(175, 231, 236, 0.65)',
  subtle: '0px 0px 4px 0px rgba(36, 41, 47, 0.1)'
} as const

// Kept for backward compatibility. These values drive control heights rather than typography.
export const lineHeight = {
  1: '26px',
  2: '32px',
  3: '40px'
} as const

export const controlHeight = lineHeight

export const textLineHeight = {
  1: '1.4',
  2: '1.5',
  3: '1.57143',
  4: '1.6'
} as const

export const mask = {
  1: '#24292F99',
  2: '#24292FBF',
  default: '#24292FBF'
} as const

export const button = {
  radius: {
    square: radius[1]
  }
} as const

export const space = {
  0: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px'
} as const

export const gap = {
  middle: space[4],
  large: space[6]
  // TODO: other gap defs
} as const
