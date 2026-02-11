import { UAParser } from 'ua-parser-js'
import { BrowserName } from 'ua-parser-js/enums'

const ua = UAParser(navigator.userAgent)

export default ua

export function isMobile() {
  return ua.device.type === 'mobile' || ua.device.type === 'tablet'
}

// Minimum recommended browser versions, consistent with `browserslist` in package.json
const recommendedBrowserVersions: Record<string, number> = {
  [BrowserName.CHROME]: 111,
  [BrowserName.EDGE]: 111,
  [BrowserName.FIREFOX]: 113,
  [BrowserName.SAFARI]: 16.4
}

export type BrowserCheckResult =
  | { ok: true }
  | { ok: false; browserName: string; recommendedVersion: number }
  | { ok: false; browserName: null; recommendedBrowser: string; recommendedVersion: number }

export function checkBrowserVersion(): BrowserCheckResult {
  const browserName = ua.browser.name
  if (!browserName || !(browserName in recommendedBrowserVersions)) {
    return {
      ok: false,
      browserName: null,
      recommendedBrowser: BrowserName.CHROME,
      recommendedVersion: recommendedBrowserVersions[BrowserName.CHROME]
    }
  }
  const recommendedVersion = recommendedBrowserVersions[browserName]
  const browserVersion = parseFloat(ua.browser.version || '0')
  if (browserVersion >= recommendedVersion) {
    return { ok: true }
  }
  return { ok: false, browserName, recommendedVersion }
}
