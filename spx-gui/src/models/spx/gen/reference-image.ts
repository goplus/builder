import { getExtFromMime, imgExts } from '@/utils/file'
import { extname } from '@/utils/path'
import type { File, Files } from '../../common/file'

export type ReferenceImageSelection =
  | {
      type: 'costume'
      costumeId: string
    }
  | {
      type: 'local-image'
    }
  | null

function getImageExtension(file: File) {
  return getExtFromMime(file.type) ?? extname(file.name).slice(1).toLowerCase()
}

function isImageFile(file: File) {
  return imgExts.includes(getImageExtension(file))
}

export function validateReferenceImage(file: File) {
  if (!isImageFile(file)) throw new Error(`unsupported reference image type: ${file.type}`)
}

export function resolveInitialReferenceImageSelection(
  selection: ReferenceImageSelection | undefined,
  legacyCostumeId: string | null | undefined,
  referenceImage: File | null
): ReferenceImageSelection {
  if (referenceImage != null) validateReferenceImage(referenceImage)
  const resolvedSelection =
    selection !== undefined
      ? selection
      : legacyCostumeId != null
        ? { type: 'costume' as const, costumeId: legacyCostumeId }
        : referenceImage != null
          ? { type: 'local-image' as const }
          : null
  if (resolvedSelection?.type === 'local-image' && referenceImage == null) {
    throw new Error('reference image expected')
  }
  return resolvedSelection
}

export function resolveSelectionAfterReferenceImageChange(
  selection: ReferenceImageSelection,
  referenceImage: File | null,
  fallbackCostumeId: string | null
): ReferenceImageSelection {
  if (referenceImage != null) {
    validateReferenceImage(referenceImage)
    return { type: 'local-image' }
  }
  if (selection?.type !== 'local-image') return selection
  return fallbackCostumeId == null ? null : { type: 'costume', costumeId: fallbackCostumeId }
}

export function saveReferenceImageFile(files: Files, basePath: string, file: File | null) {
  if (file == null) return null
  validateReferenceImage(file)
  const extension = getImageExtension(file)
  const path = `${basePath}/reference_image.${extension}`
  files[path] = file
  return path
}

export function loadReferenceImageFile(path: string, basePath: string, files: Files, owner: string) {
  const expectedPrefix = `${basePath}/reference_image.`
  if (!path.startsWith(expectedPrefix) || path.slice(expectedPrefix.length).includes('/')) {
    throw new Error(`invalid reference image path for ${owner}`)
  }
  const file = files[path]
  if (file == null) throw new Error(`file ${path} not found for ${owner}`)
  if (!isImageFile(file)) throw new Error(`invalid reference image file ${path} for ${owner}`)
  return file
}
