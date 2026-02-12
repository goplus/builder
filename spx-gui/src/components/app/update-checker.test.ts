import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkForUpdates, startUpdateChecker, stopUpdateChecker, reloadApp } from './update-checker'

vi.mock('@/utils/env', () => ({
  isDev: false
}))

describe('update-checker', () => {
  const etagKey = 'spx-gui-etag'

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    stopUpdateChecker()
  })

  describe('checkForUpdates', () => {
    it('should return false when etag is not available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        headers: {
          get: () => null
        }
      })

      const hasUpdate = await checkForUpdates()
      expect(hasUpdate).toBe(false)
    })

    it('should store etag on first check', async () => {
      const etag = '"abc123"'
      global.fetch = vi.fn().mockResolvedValue({
        headers: {
          get: (key: string) => (key === 'etag' ? etag : null)
        }
      })

      const hasUpdate = await checkForUpdates()
      expect(hasUpdate).toBe(false)
      expect(localStorage.getItem(etagKey)).toBe(etag)
    })

    it('should detect update when etag changes', async () => {
      const oldEtag = '"abc123"'
      const newEtag = '"def456"'

      localStorage.setItem(etagKey, oldEtag)

      global.fetch = vi.fn().mockResolvedValue({
        headers: {
          get: (key: string) => (key === 'etag' ? newEtag : null)
        }
      })

      const hasUpdate = await checkForUpdates()
      expect(hasUpdate).toBe(true)
    })

    it('should return false when etag is unchanged', async () => {
      const etag = '"abc123"'
      localStorage.setItem(etagKey, etag)

      global.fetch = vi.fn().mockResolvedValue({
        headers: {
          get: (key: string) => (key === 'etag' ? etag : null)
        }
      })

      const hasUpdate = await checkForUpdates()
      expect(hasUpdate).toBe(false)
    })

    it('should return null and log error on fetch failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const hasUpdate = await checkForUpdates()
      expect(hasUpdate).toBe(null)
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should use HEAD method and no-cache', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        headers: {
          get: () => null
        }
      })
      global.fetch = fetchSpy

      await checkForUpdates()

      expect(fetchSpy).toHaveBeenCalledWith('/index.html', {
        method: 'HEAD',
        cache: 'no-cache'
      })
    })
  })

  describe('startUpdateChecker', () => {
    it('should call onUpdate callback when update is detected', async () => {
      const onUpdate = vi.fn()
      const oldEtag = '"abc123"'
      const newEtag = '"def456"'

      localStorage.setItem(etagKey, oldEtag)

      global.fetch = vi.fn().mockResolvedValue({
        headers: {
          get: (key: string) => (key === 'etag' ? newEtag : null)
        }
      })

      startUpdateChecker(100, onUpdate)

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(onUpdate).toHaveBeenCalled()
    })

    it('should not call onUpdate callback when no update is detected', async () => {
      const onUpdate = vi.fn()
      const etag = '"abc123"'

      localStorage.setItem(etagKey, etag)

      global.fetch = vi.fn().mockResolvedValue({
        headers: {
          get: (key: string) => (key === 'etag' ? etag : null)
        }
      })

      startUpdateChecker(100, onUpdate)

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should check periodically', async () => {
      const onUpdate = vi.fn()
      const fetchSpy = vi.fn().mockResolvedValue({
        headers: {
          get: () => null
        }
      })
      global.fetch = fetchSpy

      startUpdateChecker(100, onUpdate)

      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(fetchSpy).toBeCalledTimes(3)
    })

    it('should warn if checker is already running', () => {
      const onUpdate = vi.fn()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      global.fetch = vi.fn().mockResolvedValue({
        headers: {
          get: () => null
        }
      })

      startUpdateChecker(100, onUpdate)
      startUpdateChecker(100, onUpdate)

      expect(consoleWarnSpy).toHaveBeenCalledWith('Update checker is already running.')
      consoleWarnSpy.mockRestore()
    })

    it('should not call onUpdate when check fails', async () => {
      const onUpdate = vi.fn()
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      startUpdateChecker(100, onUpdate)

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should stop checker after 5 consecutive failures', async () => {
      const onUpdate = vi.fn()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const fetchSpy = vi.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = fetchSpy

      startUpdateChecker(50, onUpdate)

      // Wait for 5 failures (initial + 4 more checks)
      await new Promise((resolve) => setTimeout(resolve, 250))

      expect(consoleWarnSpy).toHaveBeenCalledWith('Update checker disabled after repeated failures')
      expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(6) // Should stop after 5 failures

      // Wait more to confirm it stopped
      const callsBeforeWait = fetchSpy.mock.calls.length
      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(fetchSpy.mock.calls.length).toBe(callsBeforeWait)

      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('should reset failure count on successful check', async () => {
      const onUpdate = vi.fn()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      let callCount = 0
      const fetchSpy = vi.fn().mockImplementation(() => {
        callCount++
        // Fail 3 times, then succeed, then fail 3 more times
        if (callCount <= 3 || callCount > 4) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          headers: {
            get: () => null
          }
        })
      })
      global.fetch = fetchSpy

      startUpdateChecker(50, onUpdate)

      // Wait for 7+ checks (3 failures + 1 success + 3 failures)
      await new Promise((resolve) => setTimeout(resolve, 400))

      // Should not have stopped because failure count was reset after success
      expect(consoleWarnSpy).not.toHaveBeenCalledWith('Update checker disabled after repeated failures')

      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('stopUpdateChecker', () => {
    it('should stop the update checker', async () => {
      const onUpdate = vi.fn()
      const fetchSpy = vi.fn().mockResolvedValue({
        headers: {
          get: () => null
        }
      })
      global.fetch = fetchSpy

      startUpdateChecker(100, onUpdate)
      await new Promise((resolve) => setTimeout(resolve, 50))

      const callCountBeforeStop = fetchSpy.mock.calls.length
      stopUpdateChecker()

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(fetchSpy).toBeCalledTimes(callCountBeforeStop)
    })

    it('should allow starting checker again after stopping', () => {
      const onUpdate = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({
        headers: {
          get: () => null
        }
      })

      startUpdateChecker(100, onUpdate)
      stopUpdateChecker()

      expect(() => startUpdateChecker(100, onUpdate)).not.toThrow()
    })
  })

  describe('reloadApp', () => {
    it('should call window.location.reload', () => {
      const reloadSpy = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true
      })

      reloadApp()
      expect(reloadSpy).toHaveBeenCalled()
    })
  })
})
