import { describe, expect, it } from 'vitest'
import { fromText } from '@/models/common/file'
import { resolveInitialReferenceImageSelection, validateReferenceImage } from './reference-image'

describe('reference image selection', () => {
  it('requires an image for local selection and validates uploaded files', () => {
    expect(() => resolveInitialReferenceImageSelection({ type: 'local-image' }, null, null)).toThrow(
      'reference image expected'
    )
    expect(() => validateReferenceImage(fromText('invalid.txt', ''))).toThrow('unsupported reference image type')
    expect(() => validateReferenceImage(fromText('reference.svg', '<svg />'))).toThrow(
      'unsupported reference image type'
    )
  })
})
