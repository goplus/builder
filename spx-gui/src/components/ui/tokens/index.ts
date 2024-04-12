import * as color from './colors'

export { color }

export const fontSize = {
  // TODO: more font-related vars
  text: '14px'
} as const

export const borderRadius = {
  1: '8px',
  2: '12px',
  3: '20px'
} as const

export const boxShadow = {
  small: '0px 2px 8px 0px rgba(51, 51, 51, 0.08)',
  big: '0px 4px 24px 0px rgba(51, 51, 51, 0.08)',
  diffusion: '0px 4px 12px 0px #D0F2F8'
} as const

export const lineHeight = {
  1: '32px'
} as const

export const gap = {
  middle: '16px'
  // TODO: other gap defs
} as const
