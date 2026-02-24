import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UpdateChecker } from './update-checker'

describe('update-checker', () => {
  let checker: UpdateChecker

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    checker = new UpdateChecker()
  })

  afterEach(() => {
    checker.stop()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('checkForUpdates', () => {
    it('should throw error when response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: {
          get: () => null
        }
      })

      await expect(checker.checkForUpdates()).rejects.toThrow('HTTP error: 404')
    })

    it('should throw error when etag is not available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: () => null
        }
      })

      await expect(checker.checkForUpdates()).rejects.toThrow('ETag header not found')
    })

    it('should return false on first check', async () => {
      const etag = '"abc123"'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? etag : null)
        }
      })

      const hasUpdate = await checker.checkForUpdates()
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
      await checker.checkForUpdates()

      // Second check with new etag
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? newEtag : null)
        }
      })

      const hasUpdate = await checker.checkForUpdates()
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
      await checker.checkForUpdates()

      // Second check with same etag
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? etag : null)
        }
      })

      const hasUpdate = await checker.checkForUpdates()
      expect(hasUpdate).toBe(false)
    })

    it('should throw error on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(checker.checkForUpdates()).rejects.toThrow('Network error')
    })

    it('should use HEAD method and no-cache', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? '"v1"' : null)
        }
      })
      global.fetch = fetchSpy

      await checker.checkForUpdates()

      expect(fetchSpy).toHaveBeenCalledWith('/', {
        method: 'HEAD',
        cache: 'no-cache'
      })
    })
  })

  describe('start', () => {
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

      checker.start(100, onUpdate)

      await vi.advanceTimersByTimeAsync(150)
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

      checker.start(100, onUpdate)

      await vi.advanceTimersByTimeAsync(150)
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should check periodically', async () => {
      const onUpdate = vi.fn()
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? '"v1"' : null)
        }
      })
      global.fetch = fetchSpy

      checker.start(100, onUpdate)

      await vi.advanceTimersByTimeAsync(250)

      expect(fetchSpy).toBeCalledTimes(3)
    })

    it('should warn if checker is already running', () => {
      const onUpdate = vi.fn()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? '"v1"' : null)
        }
      })

      checker.start(100, onUpdate)
      checker.start(100, onUpdate)

      expect(consoleWarnSpy).toHaveBeenCalledWith('Update checker is already running.')
      consoleWarnSpy.mockRestore()
    })

    it('should not call onUpdate when check fails', async () => {
      const onUpdate = vi.fn()
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      checker.start(100, onUpdate)

      await vi.advanceTimersByTimeAsync(50)
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should stop checker after 5 consecutive failures', async () => {
      const onUpdate = vi.fn()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const fetchSpy = vi.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = fetchSpy

      checker.start(50, onUpdate)

      await vi.advanceTimersByTimeAsync(250)

      expect(consoleWarnSpy).toHaveBeenCalledWith('Update checker disabled after repeated failures')
      expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(6)

      const callsBeforeWait = fetchSpy.mock.calls.length
      await vi.advanceTimersByTimeAsync(150)
      expect(fetchSpy.mock.calls.length).toBe(callsBeforeWait)

      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('should reset failure count on successful check', async () => {
      const onUpdate = vi.fn()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      let callCount = 0
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++
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

      checker.start(40, onUpdate)

      await vi.advanceTimersByTimeAsync(400)
      checker.stop()

      expect(consoleWarnSpy).not.toHaveBeenCalledWith('Update checker disabled after repeated failures')

      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('stop', () => {
    it('should stop the update checker', async () => {
      const onUpdate = vi.fn()
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? '"v1"' : null)
        }
      })
      global.fetch = fetchSpy

      checker.start(100, onUpdate)
      await vi.advanceTimersByTimeAsync(50)

      const callCountBeforeStop = fetchSpy.mock.calls.length
      checker.stop()

      await vi.advanceTimersByTimeAsync(150)

      expect(fetchSpy).toBeCalledTimes(callCountBeforeStop)
    })

    it('should allow starting checker again after stopping', () => {
      const onUpdate = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (key: string) => (key === 'etag' ? '"v1"' : null)
        }
      })

      checker.start(100, onUpdate)
      checker.stop()

      expect(() => checker.start(100, onUpdate)).not.toThrow()
    })
  })
})
