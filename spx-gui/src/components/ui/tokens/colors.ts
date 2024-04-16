// Base colors

export const turquoise = {
  100: '#f3fcfd',
  200: '#e7f9fa',
  300: '#b5ebf0',
  400: '#3fcdd9',
  500: '#0bc0cf',
  600: '#0eafbc',
  700: '#0b8893',
  main: '#0bc0cf'
} as const

export const yellow = {
  100: '#fffaf5',
  200: '#fff6eb',
  300: '#fde2c0',
  400: '#fbb45d',
  500: '#faa135',
  600: '#e49330',
  700: '#b27226',
  main: '#faa135'
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
  100: '#f4faff',
  200: '#e9f5ff',
  300: '#bae1fe',
  400: '#4db2fd',
  500: '#219ffc',
  600: '#1e91e5',
  700: '#1771b3',
  main: '#219ffc'
} as const

export const red = {
  100: '#f15d64',
  200: '#ef4149',
  300: '#bc292e',
  main: '#ef4149'
} as const

export const green = {
  100: '#90e05a',
  200: '#63ce29',
  300: '#3ca80c',
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

export const sprite = {
  ...yellow,
  bgSelected: yellow[200]
}
export const sound = {
  ...purple,
  bgSelected: purple[200]
}
export const stage = {
  ...blue,
  bgSelected: blue[200]
}

export const danger = red
export const success = green
export const disabled = {
  bg: grey[300],
  text: grey[600]
}

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
