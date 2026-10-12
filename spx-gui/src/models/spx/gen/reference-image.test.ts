import { describe, expect, it } from 'vitest'
import { fromText } from '@/models/common/file'
import {
  loadReferenceImageSelection,
  resolveInitialReferenceImageSelection,
  validateReferenceImage
} from './reference-image'

describe('reference image selection', () => {
  it('keeps explicit selection over legacy costume and validates uploaded files', () => {
    expect(resolveInitialReferenceImageSelection(null, 'legacy-costume')).toBeNull()
    expect(() => validateReferenceImage(fromText('invalid.txt', ''))).toThrow('unsupported reference image type')
    expect(() => validateReferenceImage(fromText('reference.svg', '<svg />'))).toThrow(
      'unsupported reference image type'
    )
  })

  it('loads only the selected reference file and supports legacy costume IDs', () => {
    const file = fromText('reference.png', '')
    const path = 'gen/reference_image.png'
    expect(loadReferenceImageSelection(undefined, 'legacy', {})).toEqual({
      type: 'costume',
      costumeId: 'legacy'
    })
    expect(loadReferenceImageSelection({ type: 'local-image', filePath: path }, null, { [path]: file })).toEqual({
      type: 'local-image',
      file
    })
    expect(loadReferenceImageSelection({ type: 'local-image', filePath: path }, null, {})).toBeNull()
    expect(loadReferenceImageSelection({ type: 'costume', costumeId: 'selected' }, 'legacy', {})).toEqual({
      type: 'costume',
      costumeId: 'selected'
    })
  })

  it('does not select an image just because its file exists', () => {
    const file = fromText('reference.png', '')
    const path = 'gen/reference_image.png'
    const files = { [path]: file }
    expect(loadReferenceImageSelection(undefined, null, files)).toBeNull()
    expect(loadReferenceImageSelection(null, 'legacy-costume', files)).toBeNull()
  })
})
