import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref, shallowRef, type EffectScope } from 'vue'
import { File } from '@/models/common/file'
import { useFileMediaUrl } from './media'

const scopes: EffectScope[] = []

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
})

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  vi.restoreAllMocks()
})

function setup(file: File) {
  const source = shallowRef<File | null>(file)
  const element = ref<HTMLMediaElement | null>(document.createElement('video'))
  const scope = effectScope()
  scopes.push(scope)
  const media = scope.run(() => useFileMediaUrl(source, element))!
  return { source, element, scope, ...media }
}

describe('useFileMediaUrl', () => {
  it('discards a replaced source even if its resolver ignores cancellation', async () => {
    let resolve!: (url: string) => void
    const oldFile = new File('old.mp4', async () => new ArrayBuffer(0))
    const resolveOld = vi.spyOn(oldFile, 'mediaUrl').mockImplementation(() => new Promise((done) => (resolve = done)))
    const media = setup(oldFile)
    const newFile = new File('new.mp4', async () => new ArrayBuffer(0), {
      resolveMediaUrl: async () => 'https://example.com/new.mp4'
    })
    media.source.value = newFile
    await flushPromises()
    resolve('https://example.com/old.mp4')
    await flushPromises()
    expect((resolveOld.mock.calls[0][0] as AbortSignal).aborted).toBe(true)
    expect(media.url.value).toBe('https://example.com/new.mp4')
    expect(media.loading.value).toBe(true)
    expect(media.failed.value).toBe(false)
  })

  it('resolves the source again when retrying a failed load', async () => {
    const file = new File('lesson.mp4', async () => new ArrayBuffer(0))
    vi.spyOn(file, 'mediaUrl')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('https://example.com/lesson.mp4')
    const media = setup(file)
    await flushPromises()
    expect(media.failed.value).toBe(true)
    media.reload()
    await flushPromises()
    expect(media.failed.value).toBe(false)
    expect(media.url.value).toBe('https://example.com/lesson.mp4')
  })

  it('detaches the native source before revoking a local object URL', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:lesson')
    const file = new File('lesson.mp4', async () => new ArrayBuffer(0))
    const media = setup(file)
    await flushPromises()
    media.element.value!.src = media.url.value!
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {
      expect(media.element.value!.hasAttribute('src')).toBe(false)
      expect(HTMLMediaElement.prototype.load).toHaveBeenCalled()
    })
    media.scope.stop()
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:lesson')
  })
})
