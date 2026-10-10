import type { LocaleMessage } from '@/utils/i18n'
import { validatePathSegment } from '@/utils/path'
import { getStringLengthInCodePoints } from '@/utils/utils'
import { getValidName } from '@/models/common/name'

import type { TutorialProject } from './project'

const assetNameMaxLength = 100

/** A resource name is the name of its directory, so it has to be a single path segment. */
function validateAssetName(name: string): LocaleMessage | null {
  if (name === '') return { en: 'The name must not be blank', zh: '名字不可为空' }
  if (getStringLengthInCodePoints(name) > assetNameMaxLength) {
    return {
      en: `The name is too long (maximum is ${assetNameMaxLength} characters)`,
      zh: `名字长度超出限制（最多 ${assetNameMaxLength} 个字符）`
    }
  }
  return validatePathSegment(name) ?? null
}

export function validateVideoName(name: string, project: TutorialProject | null): LocaleMessage | null {
  const err = validateAssetName(name)
  if (err != null) return err
  if (project?.videos.some((video) => video.name === name)) {
    return { en: `Video with name ${name} already exists`, zh: '存在同名的视频' }
  }
  return null
}

export function getVideoName(project: TutorialProject | null, base: string) {
  if (validateAssetName(base) != null) base = 'video'
  return getValidName(base, (name) => validateVideoName(name, project) == null)
}

export function ensureValidVideoName(name: string, project: TutorialProject | null) {
  if (validateVideoName(name, project) == null) return name
  return getVideoName(project, name)
}

export function validateImageName(name: string, project: TutorialProject | null): LocaleMessage | null {
  const err = validateAssetName(name)
  if (err != null) return err
  if (project?.images.some((image) => image.name === name)) {
    return { en: `Image with name ${name} already exists`, zh: '存在同名的图片' }
  }
  return null
}

export function getImageName(project: TutorialProject | null, base: string) {
  if (validateAssetName(base) != null) base = 'image'
  return getValidName(base, (name) => validateImageName(name, project) == null)
}

export function ensureValidImageName(name: string, project: TutorialProject | null) {
  if (validateImageName(name, project) == null) return name
  return getImageName(project, name)
}
