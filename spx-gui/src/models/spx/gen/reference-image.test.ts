import { afterEach, describe, expect, it, vi } from 'vitest'
import * as exception from '@/utils/exception'
import { fromText } from '@/models/common/file'
import {
  loadReferenceImageFile,
  resolveInitialReferenceImageSelection,
  validateReferenceImage
} from './reference-image'

describe('reference image loading', () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(['missing-path', 'missing-file', 'unsupported-file'])('reports and omits a %s', (failure) => {
    const report = vi.spyOn(exception, 'capture')
    const path = 'gen/reference_image.png'
    const files = failure === 'unsupported-file' ? { [path]: fromText('invalid.txt', 'not an image') } : {}
    expect(loadReferenceImageFile(failure === 'missing-path' ? null : path, 'gen', files, 'test gen')).toBeNull()
    expect(report).toHaveBeenCalledWith(expect.any(Error))
  })

  it.each(['other/reference_image.png', 'gen/reference_image.png/../secret.png', 'gen/other.png'])(
    'still rejects an invalid reference path: %s',
    (path) => {
      expect(() => loadReferenceImageFile(path, 'gen', { [path]: fromText('image.png', '') }, 'test gen')).toThrow(
        'invalid reference image path'
      )
    }
  )

  it('keeps runtime validation strict', () => {
    expect(() => resolveInitialReferenceImageSelection({ type: 'local-image' }, null, null)).toThrow(
      'reference image expected'
    )
    expect(() => validateReferenceImage(fromText('invalid.txt', ''))).toThrow('unsupported reference image type')
    expect(() => validateReferenceImage(fromText('reference.svg', '<svg />'))).toThrow(
      'unsupported reference image type'
    )
  })
})
