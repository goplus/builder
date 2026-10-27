import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, shallowRef, type EffectScope } from 'vue'
import { File } from '@/models/common/file'
import { cloudHelpers } from '@/models/common/cloud'
import * as exceptions from './exception'
import { useFileMediaUrl } from './media'

const scopes: EffectScope[] = []

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  vi.restoreAllMocks()
})

function setup(file: File) {
  const source = shallowRef<File | null>(file)
  const scope = effectScope()
  scopes.push(scope)
  const [url, loading] = scope.run(() => useFileMediaUrl(source))!
  return { source, scope, url, loading }
}

describe('useFileMediaUrl', () => {
  it('keeps a pending replacement loading when an old resolver ignores cancellation', async () => {
    let resolveOld!: (url: string) => void
    let resolveNew!: (url: string) => void
    const resolver = vi
      .spyOn(cloudHelpers, 'getFileWebUrl')
      .mockImplementationOnce(() => new Promise((done) => (resolveOld = done)))
      .mockImplementationOnce(() => new Promise((done) => (resolveNew = done)))
    const media = setup(new File('old.mp4', async () => new ArrayBuffer(0)))
    media.source.value = new File('new.mp4', async () => new ArrayBuffer(0))
    await flushPromises()
    resolveOld('https://example.com/old.mp4')
    await flushPromises()
    expect(resolver.mock.calls[0][1]).toHaveProperty('aborted', true)
    expect(media.url.value).toBeNull()
    expect(media.loading.value).toBe(true)
    resolveNew('https://example.com/new.mp4')
    await flushPromises()
    expect(media.url.value).toBe('https://example.com/new.mp4')
    expect(media.loading.value).toBe(false)
  })

  it.each(['https://example.com/lesson.mp4', 'data:video/mp4;base64,dmlkZW8='])(
    'uses WebUrl %s without reading the file bytes',
    async (webUrl) => {
      vi.spyOn(cloudHelpers, 'getFileWebUrl').mockResolvedValue(webUrl)
      const loader = vi.fn(async () => new ArrayBuffer(0))
      const media = setup(new File('lesson.mp4', loader))
      await flushPromises()
      expect(media.url.value).toBe(webUrl)
      expect(media.loading.value).toBe(false)
      expect(loader).not.toHaveBeenCalled()
    }
  )

  it('acquires and releases an object URL for a file without a WebUrl', async () => {
    vi.spyOn(cloudHelpers, 'getFileWebUrl').mockResolvedValue(null)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:lesson')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const media = setup(new File('lesson.mp4', async () => new TextEncoder().encode('video').buffer))
    await flushPromises()
    expect(media.url.value).toBe('blob:lesson')
    expect(media.loading.value).toBe(false)
    media.scope.stop()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:lesson')
  })

  it('clears the URL and loading state when no file is selected', async () => {
    vi.spyOn(cloudHelpers, 'getFileWebUrl').mockResolvedValue('https://example.com/lesson.mp4')
    const media = setup(new File('lesson.mp4', async () => new ArrayBuffer(0)))
    await flushPromises()
    media.source.value = null
    await flushPromises()
    expect(media.url.value).toBeNull()
    expect(media.loading.value).toBe(false)
  })

  it('reports an acquisition failure and finishes URL loading', async () => {
    const error = new Error('offline')
    vi.spyOn(cloudHelpers, 'getFileWebUrl').mockRejectedValue(error)
    const capture = vi.spyOn(exceptions, 'capture').mockImplementation(() => {})
    const media = setup(new File('lesson.mp4', async () => new ArrayBuffer(0)))
    await flushPromises()
    expect(media.url.value).toBeNull()
    expect(media.loading.value).toBe(false)
    expect(capture).toHaveBeenCalledWith(error)
  })
})
