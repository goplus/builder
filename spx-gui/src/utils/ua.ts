import Bowser from 'bowser'

const parser = Bowser.getParser(navigator.userAgent)

export function isMobile(): boolean {
  const { type } = parser.getPlatform()
  // type is 'bot' | 'desktop' | 'mobile' | 'tablet' | 'tv' | undefined
  return type === 'mobile' || type === 'tablet'
}

export interface Browser {
  name?: string
  version?: string
}

export function getBrowser(): Browser {
  return parser.getBrowser()
}
