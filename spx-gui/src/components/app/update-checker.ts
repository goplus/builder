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
 * - Stores ETag in localStorage for comparison across page loads
 */
import { isDev } from '@/utils/env.ts'

export type UpdateCallback = () => void

let updateCheckTimer: ReturnType<typeof setInterval> | null = null

const etagLocalStorageKey = 'spx-gui-etag'

/**
 * Checks if there is a new version of the application available
 *
 * @returns true if a new version is detected, false otherwise
 */
export async function checkForUpdates(): Promise<boolean> {
  try {
    const response = await fetch('/index.html', {
      method: 'HEAD',
      cache: 'no-cache'
    })
    const etag = response.headers.get('etag')
    if (etag == null) return false

    const lastEtag = localStorage.getItem(etagLocalStorageKey)
    // Save the new etag immediately
    localStorage.setItem(etagLocalStorageKey, etag)
    // Return true if there was an update
    return lastEtag != null && lastEtag !== etag
  } catch (error) {
    console.error('Failed to check for updates:', error)
    return false
  }
}

/**
 * Starts periodic checking for application updates
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
  const check = async () => {
    const hasUpdate = await checkForUpdates()
    if (hasUpdate) {
      onUpdate()
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
