/**
 * @file SPX utils
 * @desc definition or helpers for spx language
 */

import { File, fromBlob, toNativeFile } from '@/models/common/file'
import { upFirst } from '../utils'
import { getMimeFromExt } from '../file'
import { stripExt } from '../path'
import { toWav } from '../audio'
import { toJpeg } from '../img'
import type { LocaleMessage } from '../i18n'
import {
  builderRGB2CSSColorString,
  builderRGBA2CSSColorString,
  builderHSB2CSSColorString,
  builderHSBA2CSSColorString,
  type BuilderRGB,
  type BuilderRGBA,
  type BuilderHSB,
  type BuilderHSBA
} from '../color'
import { map } from 'lodash'

export const packageSpx = 'github.com/goplus/spx/v2'

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

// About XGo identifier:
// ```
// identifier     = letter { letter | unicode_digit } .
// letter         = unicode_letter | "_" .
// unicode_letter = /* a Unicode code point categorized as "Letter" */ .
// unicode_digit  = /* a Unicode code point categorized as "Number, decimal digit" */ .
// ```
// See details in https://github.com/goplus/xgo/blob/fc370dac5207d1d1fda7a669bed5bd9508bf1b59/doc/spec-mini.md#identifiers

export function validateXGoIdentifierName(name: string) {
  const regex = /^[\p{L}_][\p{L}\p{Nd}_]*$/u
  if (!regex.test(name)) return { en: 'Invalid name', zh: '格式不正确' }
  if (typeKeywords.includes(name)) return { en: 'Conflict with keywords', zh: '与关键字冲突' }
  if (keywords.includes(name)) return { en: 'Conflict with keywords', zh: '与关键字冲突' }
}

export function getXGoIdentifierNameTip(target?: LocaleMessage) {
  if (target == null)
    return {
      en: 'The name can only contain letters, digits, and the character _.',
      zh: '名称只能包含中文、英文字母、数字及下划线'
    }
  return {
    en: `The ${target.en} name can only contain letters, digits, and the character _.`,
    zh: `${target.zh}名称只能包含中文、英文字母、数字及下划线`
  }
}

export function normalizeXGoIdentifierAssetName(src: string, cas: 'camel' | 'pascal') {
  src = src
    .replace(/[^\p{L}\p{Nd}]+/gu, '_')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^[^\p{L}]+/gu, '') // remove invalid starting such as numbers
  const parts = src.split('_').filter((p) => !!p)
  if (parts.length === 0) return ''
  const [firstpart, ...otherParts] = parts
  const result = [cas === 'pascal' ? upFirst(firstpart) : firstpart, ...otherParts.map(upFirst)].join('')
  return result.slice(0, 20) // 20 should be enough, it will be hard to read with too long name
}

export const specialDirections = [
  { name: 'Right', value: 90, text: { en: 'Right', zh: '右' } },
  { name: 'Left', value: -90, text: { en: 'Left', zh: '左' } },
  { name: 'Up', value: 0, text: { en: 'Up', zh: '上' } },
  { name: 'Down', value: 180, text: { en: 'Down', zh: '下' } }
]

export function exprForSpxDirection(value: number) {
  value = Math.round(value)
  const direction = specialDirections.find((d) => d.value === value)
  if (direction != null) return direction.name
  return value + ''
}

/** Name for color constructors */
export type ColorConstructor = 'RGB' | 'RGBA' | 'HSB' | 'HSBA'

export type ColorValue = {
  /** Constructor for color */
  constructor: ColorConstructor
  /** Arguments passed to the constructor */
  args: number[]
}

export function exprForSpxColor(value: ColorValue) {
  return `${value.constructor}(${value.args.join(',')})`
}

export function cssColorStringForSpxColor(value: ColorValue) {
  if (value.constructor === 'RGB') {
    return builderRGB2CSSColorString(value.args as BuilderRGB)
  } else if (value.constructor === 'RGBA') {
    return builderRGBA2CSSColorString(value.args as BuilderRGBA)
  } else if (value.constructor === 'HSB') {
    return builderHSB2CSSColorString(value.args as BuilderHSB)
  } else if (value.constructor === 'HSBA') {
    return builderHSBA2CSSColorString(value.args as BuilderHSBA)
  }
  return ''
}

export const effectKinds = [
  { name: 'ColorEffect', text: { en: 'Color', zh: '颜色' } },
  { name: 'FishEyeEffect', text: { en: 'Fish Eye', zh: '鱼眼' } },
  { name: 'WhirlEffect', text: { en: 'Whirl', zh: '旋转' } },
  { name: 'PixelateEffect', text: { en: 'Pixelate', zh: '像素化' } },
  { name: 'MosaicEffect', text: { en: 'Mosaic', zh: '马赛克' } },
  { name: 'BrightnessEffect', text: { en: 'Brightness', zh: '亮度' } },
  { name: 'GhostEffect', text: { en: 'Ghost', zh: '幽灵' } }
]

export const front = {
  name: 'Front',
  text: { en: 'Front', zh: '最前' }
}
export const back = {
  name: 'Back',
  text: { en: 'Back', zh: '最后' }
}
export const forward = {
  name: 'Forward',
  text: { en: 'Forward', zh: '前移' }
}
export const backward = {
  name: 'Backward',
  text: { en: 'Backward', zh: '后移' }
}

export const layerActions = [front, back]

export const dirActions = [forward, backward]

export type KeyDefinition = {
  /** Name in spx */
  name: string
  /** Corresponding value of `KeyboardEvent.key`, see details in https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values */
  webKeyValue: string
  /** Text for UI */
  text: LocaleMessage
}

const alphabetKeys = Array.from<unknown, KeyDefinition>({ length: 26 }, (_, i) => {
  const lowerCase = String.fromCharCode(i + 97)
  const upperCase = String.fromCharCode(i + 65)
  return {
    name: `Key${upperCase}`,
    webKeyValue: lowerCase,
    text: { en: upperCase, zh: upperCase }
  }
})

const numberKeys = Array.from<unknown, KeyDefinition>({ length: 10 }, (_, i) => {
  const num = i + ''
  return {
    name: `Key${num}`,
    webKeyValue: num,
    text: { en: num, zh: num }
  }
})

const functionKeys = Array.from<unknown, KeyDefinition>({ length: 12 }, (_, i) => {
  const fN = `F${i + 1}`
  return {
    name: `Key${fN}`,
    webKeyValue: fN,
    text: { en: fN, zh: fN }
  }
})

const arrowKeys = [
  { name: 'KeyUp', webKeyValue: 'ArrowUp', text: { en: 'Up', zh: '上' } },
  { name: 'KeyDown', webKeyValue: 'ArrowDown', text: { en: 'Down', zh: '下' } },
  { name: 'KeyLeft', webKeyValue: 'ArrowLeft', text: { en: 'Left', zh: '左' } },
  { name: 'KeyRight', webKeyValue: 'ArrowRight', text: { en: 'Right', zh: '右' } }
]

const specialKeys: KeyDefinition[] = [
  { name: 'KeySpace', webKeyValue: ' ', text: { en: 'Space', zh: '空格' } },
  { name: 'KeyEnter', webKeyValue: 'Enter', text: { en: 'Enter', zh: '回车' } },
  { name: 'KeyBackspace', webKeyValue: 'Backspace', text: { en: 'Backspace', zh: '退格' } },
  { name: 'KeyTab', webKeyValue: 'Tab', text: { en: 'Tab', zh: 'Tab' } },
  { name: 'KeyShift', webKeyValue: 'Shift', text: { en: 'Shift', zh: 'Shift' } },
  { name: 'KeyControl', webKeyValue: 'Control', text: { en: 'Control', zh: 'Ctrl' } },
  { name: 'KeyAlt', webKeyValue: 'Alt', text: { en: 'Alt', zh: 'Alt' } },
  { name: 'KeyEscape', webKeyValue: 'Escape', text: { en: 'Escape', zh: 'Esc' } }
]

export const keys = [...alphabetKeys, ...numberKeys, ...functionKeys, ...arrowKeys, ...specialKeys]
export const webKeys = keys.map((key) => key.webKeyValue)
/** Map from name (in spx) to key definition */
export const nameKeyMap = keys.reduce((map, key) => {
  map.set(key.name, key)
  return map
}, new Map<string, KeyDefinition>())

export const webKeyMap = keys.reduce((map, key) => {
  map.set(key.webKeyValue, key.text.en)
  return map
}, new Map<string, string>())
export const playActions = [
  { name: 'PlayRewind', text: { en: 'Play from start', zh: '从头播放' } },
  { name: 'PlayContinue', text: { en: 'Continue', zh: '继续' } },
  { name: 'PlayPause', text: { en: 'Pause', zh: '暂停播放' } },
  { name: 'PlayResume', text: { en: 'Resume', zh: '继续播放' } },
  { name: 'PlayStop', text: { en: 'Stop', zh: '停止播放' } }
]

export const specialObjs = [
  { name: 'Mouse', text: { en: 'Mouse', zh: '鼠标' } },
  { name: 'Edge', text: { en: 'Edge', zh: '边缘' } },
  { name: 'EdgeLeft', text: { en: 'Edge Left', zh: '左边缘' } },
  { name: 'EdgeTop', text: { en: 'Edge Top', zh: '上边缘' } },
  { name: 'EdgeRight', text: { en: 'Edge Right', zh: '右边缘' } },
  { name: 'EdgeBottom', text: { en: 'Edge Bottom', zh: '下边缘' } }
]

export const rotationStyles = [
  { name: 'None', text: { en: "Don't Rotate", zh: '不旋转' } },
  { name: 'Normal', text: { en: 'Normal', zh: '正常旋转' } },
  { name: 'LeftRight', text: { en: 'Left-Right', zh: '左右翻转' } }
]
