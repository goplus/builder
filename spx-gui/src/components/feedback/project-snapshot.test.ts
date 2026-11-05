import { createDirectUploadTask } from 'qiniu-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createUploadSession } from '@/apis/file'
import { cloudHelpers } from '@/models/common/cloud'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { loadProjectSnapshot, saveProjectSnapshot } from './project-snapshot'

vi.mock('qiniu-js', () => ({
  createDirectUploadTask: vi.fn()
}))

vi.mock('@/apis/file', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/file')>()),
  createUploadSession: vi.fn()
}))

/** Uploads to a fake Kodo bucket, keyed by file name, and serves uploaded objects via `fetch`. */
function mockKodo() {
  const objects = new Map<string, ArrayBuffer>()
  vi.mocked(createUploadSession).mockResolvedValue({
    token: 'token',
    expiresAt: '2099-01-01T00:00:00Z',
    maxSize: 20 * 1024 * 1024,
    bucket: 'test',
    region: 'z0'
  })
  vi.mocked(createDirectUploadTask).mockImplementation((source) => {
    const { data, filename } = source as { data: ArrayBuffer; filename: string }
    const key = `files/${filename}`
    objects.set(key, data)
    return {
      start: vi.fn(),
      cancel: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn((callback) => callback(JSON.stringify({ key, hash: key })))
    } as unknown as ReturnType<typeof createDirectUploadTask>
  })
  const fetchDataUrl = globalThis.fetch
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.startsWith('data:')) return fetchDataUrl(input, init)
    const object = objects.get(url.replace('https://assets.test/', ''))
    if (object == null) return new Response(null, { status: 404 })
    return new Response(object)
  })
  return objects
}

describe('project snapshot', () => {
  beforeEach(() => {
    cloudHelpers.setConfig({ baseUrl: 'https://assets.test', bucket: 'test' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    cloudHelpers.clearUniversalUrlCache()
  })

  it('saves the files to Kodo and loads them back', async () => {
    const objects = mockKodo()
    const project = new SpxProject()
    const sprite = new Sprite('Rocket')
    sprite.setCode('onStart => { say "hi" }')
    project.addSprite(sprite)

    const url = await saveProjectSnapshot(project.exportFiles())

    expect(url).toBe('kodo://test/files/project-snapshot.json')
    expect([...objects.keys()]).toEqual(['files/project-snapshot.json'])
    const loaded = new SpxProject()
    await loaded.loadFiles(await loadProjectSnapshot(url))
    expect(loaded.sprites.map((sprite) => sprite.name)).toEqual(['Rocket'])
    expect(loaded.sprites[0].code).toBe('onStart => { say "hi" }')
  })
})
