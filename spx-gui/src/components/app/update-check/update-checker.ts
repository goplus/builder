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
import { capture } from '@/utils/exception'

export type UpdateCallback = () => void

export class UpdateChecker {
  private updateCheckTimer: ReturnType<typeof setInterval> | null = null
  private currentEtag: string | null = null

  /** Normalizes ETag values by removing weak validator prefix and trimming whitespace */
  private normalizeEtag(etag: string): string {
    const trimmed = etag.trim()
    return trimmed.startsWith('W/') ? trimmed.slice(2).trim() : trimmed
  }

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

    const normalizedEtag = this.normalizeEtag(etag)
    const hasUpdate = this.currentEtag != null && this.currentEtag !== normalizedEtag
    // Initialize currentEtag on first check
    if (this.currentEtag == null) this.currentEtag = normalizedEtag
    return hasUpdate
  }

  /**
   * Starts periodic checking for application updates.
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

    const check = async () => {
      if (!navigator.onLine) return
      try {
        const hasUpdate = await this.checkForUpdates()
        if (hasUpdate && this.updateCheckTimer != null) onUpdate()
      } catch (error) {
        capture(error, 'Failed to check for updates')
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
