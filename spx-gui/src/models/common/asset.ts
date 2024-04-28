import { AssetType, type AssetData } from '@/apis/asset'
import { keywords, typeKeywords } from '@/utils/spx'
import { fromConfig, toConfig } from './file'
import { Sound } from '../sound'
import { Sprite } from '../sprite'
import { Backdrop, type BackdropInits } from '../backdrop'
import { getFiles, uploadFiles } from './cloud'
import type { Project } from '../project'
import type { Stage } from '../stage'

export type PartialAssetData = Pick<AssetData, 'displayName' | 'assetType' | 'files'>

export type AssetModel<T extends AssetType = AssetType> = T extends AssetType.Sound
  ? Sound
  : T extends AssetType.Sprite
    ? Sprite
    : T extends AssetType.Backdrop
      ? Backdrop
      : never

export async function sprite2Asset(sprite: Sprite): Promise<PartialAssetData> {
  const fileUrls = await uploadFiles(sprite.export())
  return {
    displayName: sprite.name,
    assetType: AssetType.Sprite,
    files: fileUrls
  }
}

export async function asset2Sprite(assetData: PartialAssetData) {
  const files = getFiles(assetData.files)
  const sprites = await Sprite.loadAll(files)
  if (sprites.length === 0) throw new Error('no sprite loaded')
  return sprites[0]
}
// Config for backdrop is not a standalone file in a project, but part of config for the project (`assets/index.json`).
// To save config for backdrop in asset data, we make a virtual file which contains the backdrop's config only.
const virtualBackdropConfigFileName = 'assets/__backdrop__.json'

export async function backdrop2Asset(backdrop: Backdrop): Promise<PartialAssetData> {
  const [config, files] = backdrop.export()
  files[virtualBackdropConfigFileName] = fromConfig(virtualBackdropConfigFileName, config)
  const fileUrls = await uploadFiles(files)
  return {
    displayName: backdrop.name,
    assetType: AssetType.Backdrop,
    files: fileUrls
  }
}

export async function asset2Backdrop(assetData: PartialAssetData) {
  const files = getFiles(assetData.files)
  const configFile = files[virtualBackdropConfigFileName]
  if (configFile == null) throw new Error('no config file found')
  const config = (await toConfig(configFile)) as BackdropInits
  return Backdrop.load(config, files)
}

export async function sound2Asset(sound: Sound): Promise<PartialAssetData> {
  const fileUrls = await uploadFiles(sound.export())
  return {
    displayName: sound.name,
    assetType: AssetType.Sound,
    files: fileUrls
  }
}

export async function asset2Sound(assetData: PartialAssetData) {
  const files = getFiles(assetData.files)
  const sounds = await Sound.loadAll(files)
  if (sounds.length === 0) throw new Error('no sound loaded')
  return sounds[0]
}

function validateAssetName(name: string) {
  // spx code is go+ code, and the asset name will compiled to an identifier of go+
  // so asset name rules is depend on the identifier rules of go+.
  const regex = /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]*$/
  if (!regex.test(name)) return { en: 'Invalid name', zh: '格式不正确' }
  if (typeKeywords.includes(name)) return { en: 'Conflict with keywords', zh: '与关键字冲突' }
  if (keywords.includes(name)) return { en: 'Conflict with keywords', zh: '与关键字冲突' }
}

export const spriteNameTip = {
  en: 'The sprite name can only contain ASCII letters, digits, and the character _.',
  zh: '精灵名称只能包含英文字母、数字及下划线'
}

export function validateSpriteName(name: string, project: Project | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (project != null) {
    if (project.sprites.find((s) => s.name === name))
      return { en: `Sprite with name ${name} already exists`, zh: '存在同名的精灵' }
    if (project.sounds.find((s) => s.name === name))
      return { en: `Sound with name ${name} already exists`, zh: '存在同名的声音' }
  }
}

export function validateCostumeName(name: string, sprite: Sprite | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (sprite != null && sprite.costumes.find((c) => c.name === name))
    return { en: `Costume with name ${name} already exists`, zh: '存在同名的造型' }
}

export const soundNameTip = {
  en: 'The sound name can only contain ASCII letters, digits, and the character _.',
  zh: '声音名称只能包含英文字母、数字及下划线'
}

export function validateSoundName(name: string, project: Project | null) {
  // Now same validation logic for sprite & sound
  return validateSpriteName(name, project)
}

export function validateBackdropName(name: string, stage: Stage | null) {
  const err = validateAssetName(name)
  if (err != null) return err
  if (stage != null && stage._backdrops.find((b) => b.name === name))
    return { en: `Backdrop with name ${name} already exists`, zh: '存在同名的背景' }
}

function upFirst(str: string) {
  return str[0].toUpperCase() + str.slice(1)
}

/** Convert any string to valid asset name, empty string may be returned */
export function normalizeAssetName(src: string, cas: 'camel' | 'pascal') {
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
  base = normalizeAssetName(base, 'pascal') || 'Sprite'
  return getValidName(base, (n) => validateSpriteName(n, project) == null)
}

export function ensureValidSpriteName(name: string, project: Project | null) {
  if (validateSpriteName(name, project) == null) return name
  return getSpriteName(project, name)
}

export function getCostumeName(sprite: Sprite | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'costume'
  return getValidName(base, (n) => validateCostumeName(n, sprite) == null)
}

export function ensureValidCostumeName(name: string, sprite: Sprite | null) {
  if (validateCostumeName(name, sprite) == null) return name
  return getCostumeName(sprite, name)
}

export function getSoundName(project: Project | null, base = '') {
  base = normalizeAssetName(base, 'camel') || 'sound'
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
