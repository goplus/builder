/**
 * @file SPX utils
 * @desc definition or helpers for spx language
 */

import { File, fromBlob, toNativeFile } from '@/models/common/file'
import { getMimeFromExt } from '../file'
import { stripExt } from '../path'
import { toWav } from '../audio'
import { toJpeg } from '../img'
import type { LocaleMessage } from '../i18n'

export const packageSpx = 'github.com/goplus/spx'

export const keywords = [
  'func',
  'main',
  'println',
  'if',
  'else',
  'for',
  'range',
  'break',
  'continue',
  'return',
  'switch',
  'case',
  'default',
  'type',
  'struct',
  'map',
  'chan',
  'nil',
  'true',
  'false',
  'iota',
  'const',
  'import',
  'package',
  'var',
  'error',
  'interface',
  'struct',
  'fallthrough',
  'go',
  'defer',
  'select'
]

export const typeKeywords = [
  'int',
  'float64',
  'string',
  'bool',
  'void',
  'map',
  'chan',
  'error',
  'interface',
  'struct',
  'nil'
]

/**
 * Audio file formats supported by spx.
 * See details in https://github.com/goplus/spx/blob/7f46dc7879e2320a9889f1396b9e592efb6d888d/audio.go
 */
const supportedAudioExts = ['mp3', 'wav']

/**
 * Adapt audio file to fit spx.
 *
 * Currently spx supports `mp3` and `wav` only, and it seems that wav-encoding is simpler than mp3-encoding.
 * So we convert unsupported audio files to wav before added to project.
 *
 * NOTE: wav with codec `adpcm` is supported by spx, while not natively supported by chrome (& maybe more other browsers).
 * So it is allowed to add a sound of wav file with codec `adpcm` to project, and it works in the game.
 * But it does not work as expected with audio element (`SoundPlayer`) & wavesurfer.
 */
export async function adaptAudio(file: File): Promise<File> {
  for (const ext of supportedAudioExts) {
    if (file.type === getMimeFromExt(ext)) return file
  }
  const wavAb = await toWav(await file.arrayBuffer())
  const wavFileName = stripExt(file.name) + '.wav'
  return new File(wavFileName, async () => wavAb)
}

/**
 * Image file formats supported by spx. See details in
 * - https://github.com/goplus/spx/blob/7f46dc7879e2320a9889f1396b9e592efb6d888d/spbase.go#L25-L26
 * - https://github.com/goplus/spx/blob/7f46dc7879e2320a9889f1396b9e592efb6d888d/internal/svgr/svg.go#L22
 */
const supportedImgExts = ['jpg', 'jpeg', 'png', 'svg']

/** Adapt image file to fit spx. Unsupported image files will be converted to jpeg. */
export async function adaptImg(file: File): Promise<File> {
  for (const ext of supportedImgExts) {
    if (file.type === getMimeFromExt(ext)) return file
  }
  const jpegBlob = await toJpeg(await toNativeFile(file))
  const jpegFileName = stripExt(file.name) + '.jpeg'
  return fromBlob(jpegFileName, jpegBlob)
}

export function validateGopIdentifierName(name: string) {
  const regex = /^[\u4e00-\u9fa5a-zA-Z_][\u4e00-\u9fa5a-zA-Z0-9_]*$/
  if (!regex.test(name)) return { en: 'Invalid name', zh: '格式不正确' }
  if (typeKeywords.includes(name)) return { en: 'Conflict with keywords', zh: '与关键字冲突' }
  if (keywords.includes(name)) return { en: 'Conflict with keywords', zh: '与关键字冲突' }
}

export function getGopIdentifierNameTip(target?: LocaleMessage) {
  if (target == null)
    return {
      en: 'The name can only contain Chinese / English letters, digits, and the character _.',
      zh: '名称只能包含中英文字符、数字及下划线'
    }
  return {
    en: `The ${target.en} name can only contain Chinese / English letters, digits, and the character _.`,
    zh: `${target.zh}名称只能包含中英文字符、数字及下划线`
  }
}

export const specialDirections = [
  { name: 'Right', value: 90 },
  { name: 'Left', value: -90 },
  { name: 'Up', value: 0 },
  { name: 'Down', value: 180 }
]

export function exprForSpxDirection(value: number) {
  value = Math.round(value)
  const direction = specialDirections.find((d) => d.value === value)
  if (direction != null) return direction.name
  return value + ''
}

// TODO: update effectKinds for spx2
export const effectKinds = [
  { name: 'ColorEffect', value: 0 },
  { name: 'BrightnessEffect', value: 1 },
  { name: 'GhostEffect', value: 2 }
]

export function exprForSpxEffectKind(value: number) {
  const effect = effectKinds.find((e) => e.value === value)
  if (effect == null) return null
  return effect.name
}

export const keyA = 0
export const keyZ = 25
export const key0 = 43
export const key9 = 52
export const keyF1 = 57
export const keyF12 = 68
export const keys = [
  { name: 'Up', value: 31 },
  { name: 'Down', value: 28 },
  { name: 'Left', value: 29 },
  { name: 'Right', value: 30 },
  { name: 'Space', value: 116 },
  { name: 'Enter', value: 54 },
  { name: 'Backspace', value: 34 },
  { name: 'Tab', value: 117 },
  { name: 'Shift', value: 120 },
  { name: 'Control', value: 119 },
  { name: 'Alt', value: 118 },
  { name: 'Escape', value: 56 }
]

export function exprForSpxKey(value: number): string | null {
  if (value >= keyA && value <= keyZ) return 'Key' + String.fromCharCode(value - keyA + 65)
  if (value >= key0 && value <= key9) return 'Key' + String.fromCharCode(value - key0 + 48)
  if (value >= keyF1 && value <= keyF12) return 'Key' + String.fromCharCode(value - keyF1 + 112)
  const key = keys.find((k) => k.value === value)
  if (key != null) return 'Key' + key.name
  return null
}

export const playActions = [
  { name: 'PlayRewind', value: 0 },
  { name: 'PlayContinue', value: 1 },
  { name: 'PlayPause', value: 2 },
  { name: 'PlayResume', value: 3 },
  { name: 'PlayStop', value: 4 }
]

export function exprForSpxPlayAction(value: number) {
  const action = playActions.find((a) => a.value === value)
  if (action == null) return null
  return action.name
}

export const specialObjs = [
  { name: 'Mouse', value: -5 },
  { name: 'Edge', value: 15 },
  { name: 'EdgeLeft', value: 1 },
  { name: 'EdgeTop', value: 2 },
  { name: 'EdgeRight', value: 4 },
  { name: 'EdgeBottom', value: 8 }
]

export function exprForSpxSpecialObj(value: number) {
  const obj = specialObjs.find((o) => o.value === value)
  if (obj == null) return null
  return obj.name
}
