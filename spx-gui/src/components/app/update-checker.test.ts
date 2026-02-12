import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkForUpdates, startUpdateChecker, stopUpdateChecker, reloadApp, resetUpdateChecker } from './update-checker'

vi.mock('@/utils/env', () => ({
  isDev: false
}))

describe('update-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetUpdateChecker()
  })

  afterEach(() => {
    stopUpdateChecker()
  })

  describe('checkForUpdates', () => {
    it('should return null when response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        headers: {
          get: () => null
        }
      })

      const hasUpdate = await checkForUpdates()
      expect(hasUpdate).toBe(null)
    })

    it('should return null when etag is not available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: () => null
        }
      })

      const hasUpdate = await checkForUpdates()
      expect(hasUpdate).toBe(null)
    })

    it('should return false on first check', async () => {
      const etag = '"abc123"'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? etag : null)
        }
      })

      const hasUpdate = await checkForUpdates()
      expect(hasUpdate).toBe(false)
    })

    it('should detect update when etag changes', async () => {
      const oldEtag = '"abc123"'
      const newEtag = '"def456"'

      // First check with old etag
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? oldEtag : null)
        }
      })
      await checkForUpdates()

      // Second check with new etag
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? newEtag : null)
        }
      })

      const hasUpdate = await checkForUpdates()
      expect(hasUpdate).toBe(true)
    })

    it('should return false when etag is unchanged', async () => {
      const etag = '"abc123"'

      // First check
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? etag : null)
        }
      })
      await checkForUpdates()

      // Second check with same etag
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
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
        ok: true,
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

      let callCount = 0
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++
        const etag = callCount === 1 ? oldEtag : newEtag
        return Promise.resolve({
          ok: true,
          headers: {
            get: (key: string) => (key === 'etag' ? etag : null)
          }
        })
      })

      startUpdateChecker(100, onUpdate)

      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(onUpdate).toHaveBeenCalled()
    })

    it('should not call onUpdate callback when no update is detected', async () => {
      const onUpdate = vi.fn()
      const etag = '"abc123"'

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? etag : null)
        }
      })

      startUpdateChecker(100, onUpdate)

      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should check periodically', async () => {
      const onUpdate = vi.fn()
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
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
        ok: true,
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
        // Pattern: fail, success, fail, success, ...
        // This ensures we never hit 5 consecutive failures
        if (callCount % 2 === 1) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          headers: {
            get: (key: string) => (key === 'etag' ? '"v1"' : null)
          }
        })
      })
      global.fetch = fetchSpy

      startUpdateChecker(40, onUpdate)

      // Wait for 10 checks: F S F S F S F S F S
      await new Promise((resolve) => setTimeout(resolve, 400))
      stopUpdateChecker()

      // Should not have stopped because failure count was reset after each success
      expect(consoleWarnSpy).not.toHaveBeenCalledWith('Update checker disabled after repeated failures')

      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('stopUpdateChecker', () => {
    it('should stop the update checker', async () => {
      const onUpdate = vi.fn()
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
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
        ok: true,
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
