import type { LocaleMessage } from '@/utils/i18n'
import { keywords, typeKeywords } from '@/utils/spx'
import type { Project } from '../project'
import type { Stage } from '../stage'
import type { Sprite } from '../sprite'
import type { Animation } from '../animation'

function validateAssetName(name: string) {
  if (name === '') return { en: 'The name must not be blank', zh: '名字不可为空' }
  if (name.length > 100)
    return {
      en: 'The name is too long (maximum is 100 characters)',
      zh: '名字长度超出限制（最多 100 个字符）'
    }
}

function getAssetNameTip(asset: LocaleMessage) {
  return {
    en: `The ${asset.en} name should be non-empty string with length no longer than 100.`,
    zh: `${asset.zh}名称不可为空，长度不超过 100`
  }
}

function validateGopIdentifierAssetName(name: string) {
  const err = validateAssetName(name)
  if (err != null) return err
  // spx code is go+ code, and the asset name will compiled to an identifier of go+
  // so asset name rules is depend on the identifier rules of go+.
  const regex = /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]*$/
  if (!regex.test(name)) return { en: 'Invalid name', zh: '格式不正确' }
  if (typeKeywords.includes(name)) return { en: 'Conflict with keywords', zh: '与关键字冲突' }
  if (keywords.includes(name)) return { en: 'Conflict with keywords', zh: '与关键字冲突' }
}

function getGopIdentifierAssetNameTip(asset: LocaleMessage) {
  return {
    en: `The ${asset.en} name can only contain Chineses / English letters, digits, and the character _.`,
    zh: `${asset.zh}名称只能包含中英文字符、数字及下划线`
  }
}

export const spriteNameTip = getGopIdentifierAssetNameTip({ en: 'sprite', zh: '精灵' })

export function validateSpriteName(name: string, project: Project | null) {
  // spx will use the sprite's name as identifier for the sprite variable in compiled code,
  // so it should obey the naming rule of gop identifier
  const err = validateGopIdentifierAssetName(name)
  if (err != null) return err
  if (project != null) {
    if (project.sprites.find((s) => s.name === name))
      return { en: `Sprite with name ${name} already exists`, zh: '存在同名的精灵' }
    if (project.sounds.find((s) => s.name === name))
      return { en: `Sound with name ${name} already exists`, zh: '存在同名的声音' }
  }
}

export const costumeNameTip = getAssetNameTip({ en: 'costume', zh: '造型' })

export function validateCostumeName(name: string, parent: Sprite | Animation | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (parent != null && parent.costumes.find((c) => c.name === name))
    return { en: `Costume with name ${name} already exists`, zh: '存在同名的造型' }
}

export const animationNameTip = getAssetNameTip({ en: 'animation', zh: '动画' })

export function validateAnimationName(name: string, sprite: Sprite | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (sprite != null && sprite.animations.find((a) => a.name === name))
    return { en: `Animation with name ${name} already exists`, zh: '存在同名的动画' }
}

export const soundNameTip = getGopIdentifierAssetNameTip({ en: 'sound', zh: '声音' })

export function validateSoundName(name: string, project: Project | null) {
  // Now same validation logic for sprite & sound
  return validateSpriteName(name, project)
}

export const backdropNameTip = getAssetNameTip({ en: 'backdrop', zh: '背景' })

export function validateBackdropName(name: string, stage: Stage | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (stage != null && stage.backdrops.find((b) => b.name === name))
    return { en: `Backdrop with name ${name} already exists`, zh: '存在同名的背景' }
}

export const widgetNameTip = getAssetNameTip({ en: 'widget', zh: '控件' })

export function validateWidgetName(name: string, stage: Stage | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (stage != null && stage.widgets.find((b) => b.name === name))
    return { en: `Widget with name ${name} already exists`, zh: '存在同名的控件' }
}

function upFirst(str: string) {
  return str[0].toUpperCase() + str.slice(1)
}

function lowFirst(str: string) {
  return str[0].toLowerCase() + str.slice(1)
}

/** Convert any string to valid asset name, empty string may be returned */
export function normalizeAssetName(src: string, cas: 'camel' | 'pascal') {
  if (src === '') return ''
  const result = cas === 'pascal' ? upFirst(src) : lowFirst(src)
  return result.slice(0, 20) // 20 should be enough, it will be hard to read with too long name
}

export function normalizeGopIdentifierAssetName(src: string, cas: 'camel' | 'pascal') {
  src = src
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^[^a-zA-Z]+/, '') // remove invalid starting such as numbers
  const parts = src.split('_').filter((p) => !!p)
  if (parts.length === 0) return ''
  const [firstpart, ...otherParts] = parts
  const result = [
    cas === 'pascal' ? upFirst(firstpart) : firstpart,
    ...otherParts.map(upFirst)
  ].join('')
  return result.slice(0, 20) // 20 should be enough, it will be hard to read with too long name
}

function getValidName(base: string, isValid: (name: string) => boolean) {
  let name: string
  for (let i = 1; ; i++) {
    name = i === 1 ? base : base + i
    if (isValid(name)) return name
    if (i > 10000) throw new Error(`unexpected infinite loop with base ${base}`) // for debug purpose
  }
}

export function getSpriteName(project: Project | null, base = '') {
  base = normalizeGopIdentifierAssetName(base, 'pascal') || 'Sprite'
  return getValidName(base, (n) => validateSpriteName(n, project) == null)
}

export function ensureValidSpriteName(name: string, project: Project | null) {
  if (validateSpriteName(name, project) == null) return name
  return getSpriteName(project, name)
}

export function getCostumeName(parent: Sprite | Animation | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'costume'
  return getValidName(base, (n) => validateCostumeName(n, parent) == null)
}

export function ensureValidCostumeName(name: string, parent: Sprite | Animation | null) {
  if (validateCostumeName(name, parent) == null) return name
  return getCostumeName(parent, name)
}

export function getAnimationName(sprite: Sprite | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'animation'
  return getValidName(base, (n) => validateAnimationName(n, sprite) == null)
}

export function ensureValidAnimationName(name: string, sprite: Sprite | null) {
  if (validateAnimationName(name, sprite) == null) return name
  return getAnimationName(sprite, name)
}

export function getSoundName(project: Project | null, base = '') {
  base = normalizeGopIdentifierAssetName(base, 'camel') || 'sound'
  return getValidName(base, (n) => validateSoundName(n, project) == null)
}

export function ensureValidSoundName(name: string, project: Project | null) {
  if (validateSoundName(name, project) == null) return name
  return getSoundName(project, name)
}

export function getBackdropName(stage: Stage | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'backdrop'
  return getValidName(base, (n) => validateBackdropName(n, stage) == null)
}

export function ensureValidBackdropName(name: string, stage: Stage | null) {
  if (validateBackdropName(name, stage) == null) return name
  return getBackdropName(stage, name)
}

export function getWidgetName(stage: Stage | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'widget'
  return getValidName(base, (n) => validateWidgetName(n, stage) == null)
}

export function ensureValidWidgetName(name: string, stage: Stage | null) {
  if (validateWidgetName(name, stage) == null) return name
  return getWidgetName(stage, name)
}
