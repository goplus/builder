import { getExtFromMime, imgExts } from '@/utils/file'
import { extname } from '@/utils/path'
import { capture } from '@/utils/exception'
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

/** Explicit selection (including null) takes precedence over legacy costume ID, then local image. */
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

/** Store the optional reference as reference_image.<ext> within the generation's asset directory. */
export function saveReferenceImageFile(files: Files, basePath: string, file: File | null) {
  if (file == null) return null
  validateReferenceImage(file)
  const extension = getImageExtension(file)
  const path = `${basePath}/reference_image.${extension}`
  files[path] = file
  return path
}

/** Reject invalid paths; report and omit missing or unsupported reference files when loading a saved generation. */
export function loadReferenceImageFile(path: string | null, basePath: string, files: Files, owner: string) {
  if (path != null) {
    const expectedPrefix = `${basePath}/reference_image.`
    if (!path.startsWith(expectedPrefix) || path.slice(expectedPrefix.length).includes('/')) {
      throw new Error(`invalid reference image path for ${owner}`)
    }
    const file = files[path]
    if (file != null && isImageFile(file)) return file
  }
  capture(new Error(`missing or unsupported reference image ${path ?? '(no path)'} for ${owner}`))
  return null
}
