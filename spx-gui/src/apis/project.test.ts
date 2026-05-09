import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { client } from './common'
import { ApiException, ApiExceptionCode, type MovedResourceCanonical } from './common/exception'
import { isProjectNameTaken, updateProject } from './project'

function makeMovedException(canonical: MovedResourceCanonical) {
  return new ApiException(ApiExceptionCode.errorResourceMoved, 'Resource moved', {
    req: new Request('https://api.example.com/project/John/Demo', { method: 'PATCH' }),
    meta: canonical
  })
}

describe('updateProject', () => {
  let mockedPatch: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockedPatch = vi.spyOn(client, 'patch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should retry once with the canonical project route', async () => {
    mockedPatch
      .mockRejectedValueOnce(makeMovedException({ path: '/project/john/demo', owner: 'john', name: 'demo' }))
      .mockResolvedValueOnce({
        owner: 'john',
        name: 'demo'
      })

    const saved = await updateProject('John', 'Demo', { displayName: 'Demo' })

    expect(saved).toMatchObject({
      owner: 'john',
      name: 'demo'
    })
    expect(mockedPatch).toHaveBeenCalledTimes(2)
    expect(mockedPatch.mock.calls[0]![0]).toBe('/project/John/Demo')
    expect(mockedPatch.mock.calls[1]![0]).toBe('/project/john/demo')
  })

  it('should surface moved errors without canonical project route fields', async () => {
    const movedError = makeMovedException({ path: '/project/john/demo' })
    mockedPatch.mockRejectedValueOnce(movedError)

    await expect(updateProject('John', 'Demo', { displayName: 'Demo' })).rejects.toBe(movedError)

    expect(mockedPatch).toHaveBeenCalledTimes(1)
  })

  it('should surface moved errors with empty canonical project route fields', async () => {
    const movedError = makeMovedException({ path: '/project/john/demo', owner: '', name: 'demo' })
    mockedPatch.mockRejectedValueOnce(movedError)

    await expect(updateProject('John', 'Demo', { displayName: 'Demo' })).rejects.toBe(movedError)

    expect(mockedPatch).toHaveBeenCalledTimes(1)
  })
})

describe('isProjectNameTaken', () => {
  let mockedGet: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockedGet = vi.spyOn(client, 'get')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return true for a canonical project route hit', async () => {
    mockedGet.mockResolvedValueOnce({
      owner: 'john',
      name: 'demo'
    })

    await expect(isProjectNameTaken('john', 'demo')).resolves.toBe(true)
  })

  it('should return true when the canonical project route only differs by casing', async () => {
    mockedGet.mockResolvedValueOnce({
      owner: 'john',
      name: 'demo'
    })

    await expect(isProjectNameTaken('John', 'Demo')).resolves.toBe(true)
  })

  it('should return false for an alias hit that resolves to another canonical project name', async () => {
    mockedGet.mockResolvedValueOnce({
      owner: 'john',
      name: 'renamed-demo'
    })

    await expect(isProjectNameTaken('john', 'demo')).resolves.toBe(false)
  })

  it('should return false when the project route is not found', async () => {
    mockedGet.mockRejectedValueOnce(
      new ApiException(ApiExceptionCode.errorNotFound, 'Not found', {
        req: new Request('https://api.example.com/project/john/demo', { method: 'GET' })
      })
    )

    await expect(isProjectNameTaken('john', 'demo')).resolves.toBe(false)
  })
})
