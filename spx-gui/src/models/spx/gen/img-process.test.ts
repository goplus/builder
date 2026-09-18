import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupAigcMock } from './aigc-mock' // Keep before `@/apis/aigc` so its mock is installed first
import { TaskType } from '@/apis/aigc'
import * as cloudHelpers from '@/models/common/cloud'
import { mockFile } from '../../common/test'
import { removeImageBackground, toCostumeReferenceImageUrl } from './img-process'

const aigcMock = setupAigcMock()

describe('img-process', () => {
  beforeEach(() => {
    aigcMock.reset()
    cloudHelpers.cloudHelpers.setConfig({
      baseUrl: 'https://bucket.example.com',
      bucket: 'mock-bucket'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies the generated-costume FOP to a background-removed image', () => {
    expect(toCostumeReferenceImageUrl('kodo://bucket/path/reference.png')).toBe(
      'kodo://bucket/path/reference.png?imageView2/1/w/512/h/512/format/png/colors/256'
    )
  })

  it.each(['https://example.com/reference.png', 'kodo://bucket/reference.png?imageView2/0/w/100'])(
    'rejects a non-raw Kodo URL: %s',
    (url) => {
      expect(() => toCostumeReferenceImageUrl(url)).toThrow('unprocessed Kodo image URL expected')
    }
  )

  it('removes the background and returns the task ID', async () => {
    vi.spyOn(cloudHelpers, 'saveFile').mockResolvedValue('kodo://mock-bucket/test.png')
    const input = mockFile('hero.png')
    const result = await removeImageBackground(input)

    const [taskRecord] = [...aigcMock.tasks.values()]
    expect(taskRecord.task.type).toBe(TaskType.RemoveBackground)
    expect(taskRecord.params).toEqual({ imageUrl: 'kodo://mock-bucket/test.png' })
    expect(result.taskId).toBe(taskRecord.task.id)
    expect(result.file.name).toBe('hero.png')
  })

  it('does not start background removal if cancelled during upload', async () => {
    let resolveUpload!: (url: string) => void
    const upload = new Promise<string>((resolve) => {
      resolveUpload = resolve
    })
    vi.spyOn(cloudHelpers, 'saveFile').mockReturnValueOnce(upload)
    const ctrl = new AbortController()
    const pending = removeImageBackground(mockFile('reference.png'), ctrl.signal).catch((error) => error)
    ctrl.abort()
    resolveUpload('kodo://mock-bucket/reference.png')
    expect(await pending).toBe(ctrl.signal.reason)
    expect(aigcMock.tasks.size).toBe(0)
  })
})
