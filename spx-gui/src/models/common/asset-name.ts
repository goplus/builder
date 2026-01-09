import { lowFirst, unicodeSafeSlice, upFirst } from '@/utils/utils'
import type { LocaleMessage } from '@/utils/i18n'
import { getXGoIdentifierNameTip, normalizeXGoIdentifierAssetName, validateXGoIdentifierName } from '@/utils/spx'

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

export interface SpriteLike {
  name: string
}

export interface SpriteLikeParent {
  sprites: SpriteLike[]
}

export function validateSpriteName(name: string, parent: SpriteLikeParent | null) {
  // Name of a sprite should obey the naming rule of identifiers, because:
  // 1. It will be used to name the sprite struct in compiled code
  // 2. It will be used to name the embeded field for sprite instances
  const err = validateXGoIdentifierAssetName(name)
  if (err != null) return err
  if (parent != null && parent.sprites.find((s) => s.name === name))
    return { en: `Sprite with name ${name} already exists`, zh: '存在同名的精灵' }
}

export const costumeNameTip = getAssetNameTip({ en: 'costume', zh: '造型' })

export interface CostumeLike {
  name: string
}

export interface CostumeLikeParent {
  costumes: CostumeLike[]
}

export function validateCostumeName(name: string, parent: CostumeLikeParent | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (parent != null && parent.costumes.find((c) => c.name === name))
    return { en: `Costume with name ${name} already exists`, zh: '存在同名的造型' }
}

export const animationNameTip = getAssetNameTip({ en: 'animation', zh: '动画' })

export interface AnimationLike {
  name: string
}

export interface AnimationLikeParent {
  animations: AnimationLike[]
}

export function validateAnimationName(name: string, parent: AnimationLikeParent | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (parent != null && parent.animations.find((a) => a.name === name))
    return { en: `Animation with name ${name} already exists`, zh: '存在同名的动画' }
}

export const soundNameTip = getAssetNameTip({ en: 'sound', zh: '声音' })

export interface SoundLike {
  name: string
}

export interface SoundLikeParent {
  sounds: SoundLike[]
}

export function validateSoundName(name: string, parent: SoundLikeParent | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (parent != null && parent.sounds.find((s) => s.name === name))
    return { en: `Sound with name ${name} already exists`, zh: '存在同名的声音' }
}

export const backdropNameTip = getAssetNameTip({ en: 'backdrop', zh: '背景' })

export interface BackdropLike {
  name: string
}

export interface BackdropLikeParent {
  backdrops: BackdropLike[]
}

export function validateBackdropName(name: string, parent: BackdropLikeParent | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (parent != null && parent.backdrops.find((b) => b.name === name))
    return { en: `Backdrop with name ${name} already exists`, zh: '存在同名的背景' }
}

export const widgetNameTip = getAssetNameTip({ en: 'widget', zh: '控件' })

export interface WidgetLike {
  name: string
}

export interface WidgetLikeParent {
  widgets: WidgetLike[]
}

export function validateWidgetName(name: string, parent: WidgetLikeParent | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (parent != null && parent.widgets.find((b) => b.name === name))
    return { en: `Widget with name ${name} already exists`, zh: '存在同名的控件' }
}

/** Convert any string to valid asset name, empty string may be returned */
export function normalizeAssetName(src: string, cas: 'camel' | 'pascal') {
  if (src === '') return ''
  const result = cas === 'pascal' ? upFirst(src) : lowFirst(src)
  // TODO: 20 makes animation costumes same name
  return unicodeSafeSlice(result, 0, 20) // 20 should be enough, it will be hard to read with too long name
}

function getValidName(base: string, isValid: (name: string) => boolean) {
  let name: string
  for (let i = 1; ; i++) {
    name = i === 1 ? base : base + i
    if (isValid(name)) return name
    if (i > 10000) throw new Error(`unexpected infinite loop with base ${base}`) // for debug purpose
  }
}

export function getSpriteName(parent: SpriteLikeParent | null, base = '') {
  base = normalizeXGoIdentifierAssetName(base, 'pascal') || 'MySprite'
  return getValidName(base, (n) => validateSpriteName(n, parent) == null)
}

export function ensureValidSpriteName(name: string, parent: SpriteLikeParent | null) {
  if (validateSpriteName(name, parent) == null) return name
  return getSpriteName(parent, name)
}

export function getCostumeName(parent: CostumeLikeParent | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'costume'
  return getValidName(base, (n) => validateCostumeName(n, parent) == null)
}

export function ensureValidCostumeName(name: string, parent: CostumeLikeParent | null) {
  if (validateCostumeName(name, parent) == null) return name
  return getCostumeName(parent, name)
}

export function getAnimationName(parent: AnimationLikeParent | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'animation'
  return getValidName(base, (n) => validateAnimationName(n, parent) == null)
}

export function ensureValidAnimationName(name: string, parent: AnimationLikeParent | null) {
  if (validateAnimationName(name, parent) == null) return name
  return getAnimationName(parent, name)
}

export function getSoundName(parent: SoundLikeParent | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'sound'
  return getValidName(base, (n) => validateSoundName(n, parent) == null)
}

export function ensureValidSoundName(name: string, parent: SoundLikeParent | null) {
  if (validateSoundName(name, parent) == null) return name
  return getSoundName(parent, name)
}

export function getBackdropName(parent: BackdropLikeParent | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'backdrop'
  return getValidName(base, (n) => validateBackdropName(n, parent) == null)
}

export function ensureValidBackdropName(name: string, parent: BackdropLikeParent | null) {
  if (validateBackdropName(name, parent) == null) return name
  return getBackdropName(parent, name)
}

export function getWidgetName(parent: WidgetLikeParent | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'widget'
  return getValidName(base, (n) => validateWidgetName(n, parent) == null)
}

export function ensureValidWidgetName(name: string, parent: WidgetLikeParent | null) {
  if (validateWidgetName(name, parent) == null) return name
  return getWidgetName(parent, name)
}
