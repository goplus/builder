import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { client } from './common'
import { ApiException, ApiExceptionCode } from './common/exception'
import { isUsernameTaken } from './user'

describe('isUsernameTaken', () => {
  let mockedGet: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockedGet = vi.spyOn(client, 'get')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return true for a canonical username hit', async () => {
    mockedGet.mockResolvedValueOnce({
      username: 'john'
    })

    await expect(isUsernameTaken('john')).resolves.toBe(true)
  })

  it('should return true when the canonical username only differs by casing', async () => {
    mockedGet.mockResolvedValueOnce({
      username: 'john'
    })

    await expect(isUsernameTaken('John')).resolves.toBe(true)
  })

  it('should return false for an alias hit that resolves to another canonical username', async () => {
    mockedGet.mockResolvedValueOnce({
      username: 'renamed-john'
    })

    await expect(isUsernameTaken('john')).resolves.toBe(false)
  })

  it('should return false when the username is not found', async () => {
    mockedGet.mockRejectedValueOnce(
      new ApiException(ApiExceptionCode.errorNotFound, 'Not found', {
        req: new Request('https://api.example.com/user/john', { method: 'GET' })
      })
    )

    await expect(isUsernameTaken('john')).resolves.toBe(false)
  })
})
