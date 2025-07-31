import { lowFirst, upFirst } from '@/utils/utils'
import type { LocaleMessage } from '@/utils/i18n'
import { getXGoIdentifierNameTip, normalizeXGoIdentifierAssetName, validateXGoIdentifierName } from '@/utils/spx'
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

export function validateAssetDisplayName(name: string) {
  name = name.trim()
  if (name === '') return { en: 'The asset name must not be blank', zh: '名称不可为空' }
  if (name.length > 100)
    return {
      en: 'The name is too long (maximum is 100 characters)',
      zh: '名字长度超出限制（最多 100 个字符）'
    }
}

export function getAssetDisplayNameTip() {
  return {
    en: 'A good name makes it easy to be found in asset library.',
    zh: '起一个准确的名字，可以帮助你下次更快地找到它'
  }
}

function validateXGoIdentifierAssetName(name: string) {
  const err = validateAssetName(name)
  if (err != null) return err
  return validateXGoIdentifierName(name)
}

function getXGoIdentifierAssetNameTip(asset: LocaleMessage) {
  return getXGoIdentifierNameTip(asset)
}

export const spriteNameTip = getXGoIdentifierAssetNameTip({ en: 'sprite', zh: '精灵' })

export function validateSpriteName(name: string, project: Project | null) {
  // Name of a sprite should obey the naming rule of identifiers, because:
  // 1. It will be used to name the sprite struct in compiled code
  // 2. It will be used to name the identifier in auto-binding
  const err = validateXGoIdentifierAssetName(name)
  if (err != null) return err
  if (project != null) {
    // Naming conflict between a sprite & a sound will make it impossible to do auto-binding for both of them.
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

export const soundNameTip = getXGoIdentifierAssetNameTip({ en: 'sound', zh: '声音' })

export function validateSoundName(name: string, project: Project | null) {
  // Name of a sound should obey the naming rule of identifiers, because:
  // It will be used to name the identifier in auto-binding
  const err = validateXGoIdentifierAssetName(name)
  if (err != null) return err
  if (project != null) {
    // Naming conflict between a sprite & a sound will make it impossible to do auto-binding for both of them.
    if (project.sprites.find((s) => s.name === name))
      return { en: `Sprite with name ${name} already exists`, zh: '存在同名的精灵' }
    if (project.sounds.find((s) => s.name === name))
      return { en: `Sound with name ${name} already exists`, zh: '存在同名的声音' }
  }
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

/** Convert any string to valid asset name, empty string may be returned */
export function normalizeAssetName(src: string, cas: 'camel' | 'pascal') {
  if (src === '') return ''
  const result = cas === 'pascal' ? upFirst(src) : lowFirst(src)
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
  base = normalizeXGoIdentifierAssetName(base, 'pascal') || 'MySprite'
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
  base = normalizeXGoIdentifierAssetName(base, 'camel') || 'sound'
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
