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
    expect(loadReferenceImageSelection(undefined, 'legacy', undefined, {})).toEqual({
      type: 'costume',
      costumeId: 'legacy'
    })
    expect(loadReferenceImageSelection({ type: 'local-image' }, null, path, { [path]: file })).toEqual({
      type: 'local-image',
      file
    })
    expect(loadReferenceImageSelection(undefined, null, path, { [path]: file })).toEqual({
      type: 'local-image',
      file
    })
    expect(loadReferenceImageSelection({ type: 'local-image' }, null, path, {})).toBeNull()
    expect(loadReferenceImageSelection({ type: 'costume', costumeId: 'selected' }, null, path, {})).toEqual({
      type: 'costume',
      costumeId: 'selected'
    })
  })

  it('loads the path stored in the selection before a legacy path', () => {
    const file = fromText('reference.png', '')
    const path = 'gen/reference_image.png'
    const legacyPath = 'gen/old_reference.png'
    const files = { [path]: file, [legacyPath]: fromText('old.png', '') }

    expect(loadReferenceImageSelection({ type: 'local-image', filePath: path }, null, legacyPath, files)).toEqual({
      type: 'local-image',
      file
    })
    expect(
      loadReferenceImageSelection({ type: 'local-image', filePath: path }, null, legacyPath, {
        [legacyPath]: files[legacyPath]
      })
    ).toBeNull()
    expect(loadReferenceImageSelection(null, 'legacy-costume', legacyPath, files)).toBeNull()
  })
})
