import type { LocaleMessage } from '@/utils/i18n'
import { assetDisplayNameMaxLength } from '@/apis/asset'
import { getStringLengthInCodePoints, lowFirst, unicodeSafeSlice, upFirst } from '@/utils/utils'
import { getXGoIdentifierNameTip, normalizeXGoIdentifierAssetName, validateXGoIdentifierName } from '@/utils/xgo'
import {
  resourceAnimationName,
  resourceBackdropName,
  resourceCostumeName,
  resourceSoundName,
  resourceSpriteName,
  resourceWidgetName
} from './resource'

const assetNameMaxLength = 100

function validateAssetName(name: string) {
  if (name === '') return { en: 'The name must not be blank', zh: '名字不可为空' }
  if (getStringLengthInCodePoints(name) > assetNameMaxLength)
    return {
      en: `The name is too long (maximum is ${assetNameMaxLength} characters)`,
      zh: `名字长度超出限制（最多 ${assetNameMaxLength} 个字符）`
    }
}

function getAssetNameTip(asset: LocaleMessage) {
  return {
    en: `The ${asset.en} name should be non-empty string with length no longer than ${assetNameMaxLength}.`,
    zh: `${asset.zh}名称不可为空，长度不超过 ${assetNameMaxLength}`
  }
}

export function validateAssetDisplayName(name: string) {
  name = name.trim()
  if (name === '') return { en: 'The asset name must not be blank', zh: '名称不可为空' }
  if (getStringLengthInCodePoints(name) > assetDisplayNameMaxLength)
    return {
      en: `The name is too long (maximum is ${assetDisplayNameMaxLength} characters)`,
      zh: `名字长度超出限制（最多 ${assetDisplayNameMaxLength} 个字符）`
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

export const spriteNameTip = getXGoIdentifierAssetNameTip(resourceSpriteName)

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

export const costumeNameTip = getAssetNameTip(resourceCostumeName)

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

export const animationNameTip = getAssetNameTip(resourceAnimationName)

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

export const soundNameTip = getAssetNameTip(resourceSoundName)

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

export const backdropNameTip = getAssetNameTip(resourceBackdropName)

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

export const widgetNameTip = getAssetNameTip(resourceWidgetName)

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
  // 50 should be enough, it will be hard to read with too long name
  // TODO: should we move the truncation to outer layer?
  return unicodeSafeSlice(result, 0, 50)
}

const numericSuffixRE = /^(.*?)(\d+)$/

function splitNumericSuffix(name: string) {
  const match = name.match(numericSuffixRE)
  if (match == null) return null
  return {
    base: match[1],
    num: parseInt(match[2], 10),
    numWidth: match[2].length
  }
}

function formatNumericSuffix(base: string, num: number, numWidth: number) {
  const suffix = numWidth > 1 ? String(num).padStart(numWidth, '0') : String(num)
  return base + suffix
}

function getValidName(initialName: string, isValid: (name: string) => boolean) {
  if (initialName === '') throw new Error('name must not be blank')
  if (isValid(initialName)) return initialName

  // Try to add/increment numeric suffix to find a valid name
  const splitted = splitNumericSuffix(initialName)
  const base = splitted == null ? initialName : splitted.base
  const initialNum = splitted == null ? 1 : splitted.num
  const numWidth = splitted == null ? 1 : splitted.numWidth

  for (let i = initialNum + 1; ; i++) {
    const name = formatNumericSuffix(base, i, numWidth)
    if (isValid(name)) return name
    if (i - initialNum > 10000) {
      throw new Error(`unexpected infinite loop with base ${initialName}`)
    }
  }
}

export function getSpriteName(parent: SpriteLikeParent | null, base: string) {
  base = normalizeXGoIdentifierAssetName(base, 'pascal') || 'Sprite1'
  return getValidName(base, (n) => validateSpriteName(n, parent) == null)
}

export function ensureValidSpriteName(name: string, parent: SpriteLikeParent | null) {
  if (validateSpriteName(name, parent) == null) return name
  return getSpriteName(parent, name)
}

export function getCostumeName(parent: CostumeLikeParent | null, base: string) {
  base = normalizeAssetName(base, 'camel') || 'costume1'
  return getValidName(base, (n) => validateCostumeName(n, parent) == null)
}

export function ensureValidCostumeName(name: string, parent: CostumeLikeParent | null) {
  if (validateCostumeName(name, parent) == null) return name
  return getCostumeName(parent, name)
}

export function getAnimationName(parent: AnimationLikeParent | null, base: string) {
  base = normalizeAssetName(base, 'camel') || 'animation1'
  return getValidName(base, (n) => validateAnimationName(n, parent) == null)
}

export function ensureValidAnimationName(name: string, parent: AnimationLikeParent | null) {
  if (validateAnimationName(name, parent) == null) return name
  return getAnimationName(parent, name)
}

export function getSoundName(parent: SoundLikeParent | null, base: string) {
  base = normalizeAssetName(base, 'camel') || 'sound1'
  return getValidName(base, (n) => validateSoundName(n, parent) == null)
}

export function ensureValidSoundName(name: string, parent: SoundLikeParent | null) {
  if (validateSoundName(name, parent) == null) return name
  return getSoundName(parent, name)
}

export function getBackdropName(parent: BackdropLikeParent | null, base: string) {
  base = normalizeAssetName(base, 'camel') || 'backdrop1'
  return getValidName(base, (n) => validateBackdropName(n, parent) == null)
}

export function ensureValidBackdropName(name: string, parent: BackdropLikeParent | null) {
  if (validateBackdropName(name, parent) == null) return name
  return getBackdropName(parent, name)
}

export function getWidgetName(parent: WidgetLikeParent | null, base: string) {
  base = normalizeAssetName(base, 'camel') || 'widget1'
  return getValidName(base, (n) => validateWidgetName(n, parent) == null)
}

export function ensureValidWidgetName(name: string, parent: WidgetLikeParent | null) {
  if (validateWidgetName(name, parent) == null) return name
  return getWidgetName(parent, name)
}
