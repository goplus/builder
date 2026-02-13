import { getBrowser } from '@/utils/ua'

export const BrowserName = {
  CHROME: 'Chrome',
  EDGE: 'Edge',
  FIREFOX: 'Firefox',
  SAFARI: 'Safari'
} as const

// Minimum recommended browser versions (manually maintained to match browserslist config)
const recommendedBrowserVersions: Record<string, string> = {
  [BrowserName.CHROME]: '111',
  [BrowserName.EDGE]: '111',
  [BrowserName.FIREFOX]: '113',
  [BrowserName.SAFARI]: '16.4'
}

export type BrowserCheckResult =
  | { ok: true }
  | { ok: false; browserName: string; recommendedVersion: string }
  | { ok: false; browserName: null; recommendedBrowser: string; recommendedVersion: string }

/**
 * Checks if the current browser meets minimum version requirements.
 *
 * @returns An object indicating the check result:
 *   - `{ ok: true }` if the browser version meets requirements
 *   - `{ ok: false, browserName, recommendedVersion }` if a known browser is outdated
 *   - `{ ok: false, browserName: null, recommendedBrowser, recommendedVersion }` if the browser is unknown/unsupported
 */
export function checkBrowserVersion(): BrowserCheckResult {
  const { name, version } = getBrowser()
  if (name == null || !(name in recommendedBrowserVersions)) {
    return {
      ok: false,
      browserName: null,
      recommendedBrowser: BrowserName.CHROME,
      recommendedVersion: recommendedBrowserVersions[BrowserName.CHROME]
    }
  }
  const recommendedVersion = recommendedBrowserVersions[name]
  const browserVersion = version || '0'
  if (compareVersions(browserVersion, recommendedVersion) >= 0) {
    return { ok: true }
  }
  return { ok: false, browserName: name, recommendedVersion }
}

/**
 * Compares two version strings (e.g., "16.10" vs "16.4").
 *
 * @param version - The version string to compare (e.g., browser version)
 * @param target - The target version string to compare against (e.g., recommended version)
 * @returns A positive number if `version` is greater than `target`, negative if less, or 0 if equal
 */
export function compareVersions(version: string, target: string): number {
  const parts = version.split('.').map((part) => parseInt(part, 10) || 0)
  const major = parts[0] || 0
  const minor = parts[1] || 0

  const targetParts = target.split('.').map((part) => parseInt(part, 10) || 0)
  const targetMajor = targetParts[0] || 0
  const targetMinor = targetParts[1] || 0

  if (major !== targetMajor) {
    return major - targetMajor
  }
  return minor - targetMinor
}
