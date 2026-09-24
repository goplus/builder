import { getExtFromMime, imgExts } from '@/utils/file'
import { extname } from '@/utils/path'
import type { File, Files } from '../../common/file'

export const referenceImageExts = imgExts.filter((ext) => ext !== 'svg')

export type ReferenceImageSelection =
  | {
      type: 'costume'
      costumeId: string
    }
  | {
      type: 'local-image'
      file: File
    }
  | null

export type StoredReferenceImageSelection = { type: 'costume'; costumeId: string } | { type: 'local-image' } | null

function getImageExtension(file: File) {
  return getExtFromMime(file.type) ?? extname(file.name).slice(1).toLowerCase()
}

function isImageFile(file: File) {
  return referenceImageExts.includes(getImageExtension(file))
}

export function validateReferenceImage(file: File) {
  if (!isImageFile(file)) throw new Error(`unsupported reference image type: ${file.type}`)
}

/** Explicit selection (including null) takes precedence over legacy costume ID. */
export function resolveInitialReferenceImageSelection(
  selection: ReferenceImageSelection | undefined,
  legacyCostumeId: string | null | undefined
): ReferenceImageSelection {
  return selection !== undefined
    ? selection
    : legacyCostumeId == null
      ? null
      : { type: 'costume', costumeId: legacyCostumeId }
}

export function loadReferenceImageSelection(
  selection: StoredReferenceImageSelection | undefined,
  legacyCostumeId: string | null | undefined,
  path: string | undefined,
  files: Files
): ReferenceImageSelection {
  if (selection === undefined) {
    selection = resolveInitialReferenceImageSelection(undefined, legacyCostumeId)
    if (selection == null && path != null) selection = { type: 'local-image' }
  }
  if (selection?.type !== 'local-image') return selection
  const file = path == null ? null : files[path]
  return file == null ? null : { type: 'local-image', file }
}

export function resolveSelectionAfterReferenceImageChange(
  selection: ReferenceImageSelection,
  referenceImage: File | null,
  fallbackCostumeId: string | null
): ReferenceImageSelection {
  if (referenceImage != null) {
    validateReferenceImage(referenceImage)
    return { type: 'local-image', file: referenceImage }
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
