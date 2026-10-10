import { getExtFromMime, imgExts } from '@/utils/file'
import { extname } from '@/utils/path'
import { DefaultException } from '@/utils/exception'
import { getImageSize, type File, type Files } from '../../common/file'

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

export async function validateAnimationReferenceImage(file: File) {
  const { width, height } = await getImageSize(file)
  const minDimension = 256
  const maxDimension = 5760
  if (width < minDimension || height < minDimension || width > maxDimension || height > maxDimension) {
    throw new DefaultException({
      en: `Video reference image width and height must each be between ${minDimension} and ${maxDimension} pixels. Selected image: ${width}×${height}.`,
      zh: `视频参考图的宽、高均须在 ${minDimension}～${maxDimension} 像素之间，当前图片为 ${width}×${height} 像素。`
    })
  }
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
  if (referenceImage != null) return { type: 'local-image', file: referenceImage }
  if (selection?.type !== 'local-image') return selection
  return fallbackCostumeId == null ? null : { type: 'costume', costumeId: fallbackCostumeId }
}

/** Store the optional reference as reference_image.<ext> within the generation's asset directory. */
export function saveReferenceImageFile(files: Files, basePath: string, file: File | null) {
  if (file == null) return null
  const extension = getImageExtension(file)
  const path = `${basePath}/reference_image.${extension}`
  files[path] = file
  return path
}
