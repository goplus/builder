/**
 * Application update checker
 *
 * Detects when a new version of the application is deployed by checking the
 * ETag of the root path. When a new version is detected, it notifies
 * the user through a callback.
 *
 * Implementation details:
 * - Only runs in production builds
 * - Uses HTTP HEAD requests to minimize bandwidth
 * - Stores current version ETag in memory during the session
 */

export type UpdateCallback = () => void

export class UpdateChecker {
  private updateCheckTimer: ReturnType<typeof setInterval> | null = null
  private currentEtag: string | null = null

  /**
   * Checks if there is a new version of the application available
   *
   * @returns true if a new version is detected, false if no update
   * @throws {Error} If the check fails (network error, HTTP error, or missing ETag)
   */
  async checkForUpdates(): Promise<boolean> {
    const response = await fetch('/', {
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

    const hasUpdate = this.currentEtag != null && this.currentEtag !== etag
    this.currentEtag = etag
    return hasUpdate
  }

  /**
   * Starts periodic checking for application updates. Automatically stops after 5 consecutive check failures.
   *
   * @param intervalMs - Check interval in milliseconds
   * @param onUpdate - Callback function to be called when an update is detected
   */
  start(intervalMs: number, onUpdate: UpdateCallback): void {
    if (process.env.NODE_ENV === 'development') return
    if (this.updateCheckTimer != null) {
      console.warn('Update checker is already running.')
      return
    }

    const MAX_FAILURES = 5
    let consecutiveFailures = 0

    const check = async () => {
      try {
        const hasUpdate = await this.checkForUpdates()
        consecutiveFailures = 0
        if (hasUpdate && this.updateCheckTimer != null) {
          this.stop()
          onUpdate()
        }
      } catch (error) {
        console.error('Failed to check for updates:', error)
        consecutiveFailures++
        if (consecutiveFailures >= MAX_FAILURES) {
          this.stop()
          console.warn('Update checker disabled after repeated failures')
        }
      }
    }

    void check()
    this.updateCheckTimer = setInterval(check, intervalMs)
  }

  /**
   * Stops the update checker
   */
  stop(): void {
    if (this.updateCheckTimer != null) {
      clearInterval(this.updateCheckTimer)
      this.updateCheckTimer = null
    }
  }
}
