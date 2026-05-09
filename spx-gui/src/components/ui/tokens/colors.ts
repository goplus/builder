// Base colors

export const turquoise = {
  100: '#f3fbfc',
  200: '#eaf9fa',
  300: '#afe7ec',
  400: '#3fcdd9',
  500: '#36c2cf',
  600: '#2b9ba5',
  700: '#20747c',
  main: '#36c2cf'
} as const

export const yellow = {
  100: '#fff8f1',
  200: '#fff1e2',
  300: '#ffe2c2',
  400: '#ffc584',
  500: '#ff9f33',
  600: '#ce8029',
  700: '#9d611f',
  main: '#ff9f33'
} as const

export const purple = {
  100: '#faf8ff',
  200: '#f6f1ff',
  300: '#e2d4ff',
  400: '#b390ff',
  500: '#a074ff',
  600: '#926ae8',
  700: '#7252b5',
  main: '#a074ff'
} as const

export const blue = {
  100: '#eff7ff',
  200: '#dfefff',
  300: '#b8e0ff',
  400: '#78c7ff',
  500: '#4cb8ff',
  600: '#0693f1',
  700: '#0076ce',
  main: '#4cb8ff'
} as const

export const red = {
  100: '#feefef',
  200: '#fdc7c7',
  300: '#ff97a0',
  400: '#f15d64',
  500: '#ef4149',
  600: '#bc292e',
  main: '#ef4149'
} as const

export const green = {
  100: '#e0f8e3',
  200: '#cbf1cd',
  300: '#b0ea90',
  400: '#90e05a',
  500: '#63ce29',
  600: '#3ca80c',
  main: '#63ce29'
} as const

export const grey = {
  100: '#ffffff',
  200: '#fbfcfd',
  300: '#f6f8fa',
  400: '#eaeff3',
  500: '#d9dfe5',
  600: '#cbd2d8',
  700: '#a7b1bb',
  800: '#6e7781',
  900: '#57606a',
  1000: '#24292f'
} as const

// Semantic colors

export const primary = turquoise

export const danger = red
export const success = green
export const disabled = {
  bg: grey[300],
  text: grey[600]
}

export const overlay = {
  // Used by full-screen loading and running-state cover layers.
  loading: 'rgba(36, 41, 47, 0.6)',
  // Used by modal backdrops, which need a heavier page dim.
  modal: 'rgba(36, 41, 47, 0.75)'
} as const

export const title = grey[1000]
export const text = grey[900]

/** Color for hint text */
export const hint = {
  /** Color for hint text, while darker */
  1: grey[800],
  /** Color for hint text, while lighter */
  2: grey[700]
} as const

/** Color for dividing line */
export const dividingLine = {
  /** Color for dividing line, while darker */
  1: grey[500],
  /** Color for dividing line, while lighter */
  2: grey[400]
} as const

export const border = grey[600]
