/**
 * Application update checker
 *
 * Detects when a new version of the application is deployed by checking the
 * ETag of the index.html file. When a new version is detected, it notifies
 * the user through a callback.
 *
 * Implementation details:
 * - Only runs in production builds
 * - Uses HTTP HEAD requests to minimize bandwidth
 * - Stores ETag in memory during the session
 */
import { isDev } from '@/utils/env'

export type UpdateCallback = () => void

let updateCheckTimer: ReturnType<typeof setInterval> | null = null

let lastEtag: string | null = null

/**
 * Checks if there is a new version of the application available (exposed for testing)
 *
 * @returns true if a new version is detected, false if no update
 * @throws {Error} If the check fails (network error, HTTP error, or missing ETag)
 */
export async function checkForUpdates(): Promise<boolean> {
  const response = await fetch('/index.html', {
    method: 'HEAD',
    cache: 'no-cache'
  })
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }
  const etag = response.headers.get('etag')
  if (etag == null) {
    throw new Error('ETag header not found')
  }

  const hasUpdate = lastEtag != null && lastEtag !== etag
  lastEtag = etag
  return hasUpdate
}

/**
 * Starts periodic checking for application updates. Automatically stops after 5 consecutive check failures.
 *
 * @param intervalMs - Check interval in milliseconds
 * @param onUpdate - Callback function to be called when an update is detected
 */
export function startUpdateChecker(intervalMs: number, onUpdate: UpdateCallback): void {
  if (isDev) return
  if (updateCheckTimer != null) {
    console.warn('Update checker is already running.')
    return
  }

  const MAX_FAILURES = 5
  let consecutiveFailures = 0

  const check = async () => {
    try {
      const hasUpdate = await checkForUpdates()
      consecutiveFailures = 0
      if (hasUpdate) onUpdate()
    } catch (error) {
      console.error('Failed to check for updates:', error)
      consecutiveFailures++
      if (consecutiveFailures >= MAX_FAILURES) {
        stopUpdateChecker()
        console.warn('Update checker disabled after repeated failures')
      }
    }
  }

  check()
  updateCheckTimer = setInterval(check, intervalMs)
}

/**
 * Stops the update checker
 */
export function stopUpdateChecker() {
  if (updateCheckTimer != null) {
    clearInterval(updateCheckTimer)
    updateCheckTimer = null
  }
}

/**
 * Reloads the application
 */
export function reloadApp() {
  window.location.reload()
}

/**
 * Resets the update checker state (for testing)
 */
export function resetUpdateChecker() {
  lastEtag = null
  stopUpdateChecker()
}
