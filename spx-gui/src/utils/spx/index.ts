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

export const operators = [
  '=',
  '>',
  '<',
  '!',
  '~',
  '?',
  ':',
  '==',
  '<=',
  '>=',
  '!=',
  '&&',
  '||',
  '++',
  '--',
  '+',
  '-',
  '*',
  '/',
  '&',
  '|',
  '^',
  '%',
  '<<',
  '>>',
  '+=',
  '-=',
  '*=',
  '/=',
  '&=',
  '|=',
  '^=',
  '%=',
  '<<=',
  '>>=',
  '=>'
]

export const brackets = [
  { open: '{', close: '}', token: 'delimiter.curly' },
  { open: '[', close: ']', token: 'delimiter.bracket' },
  { open: '(', close: ')', token: 'delimiter.parenthesis' }
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
      en: 'The name can only contain Chineses / English letters, digits, and the character _.',
      zh: '名称只能包含中英文字符、数字及下划线'
    }
  return {
    en: `The ${target.en} name can only contain Chineses / English letters, digits, and the character _.`,
    zh: `${target.zh}名称只能包含中英文字符、数字及下划线`
  }
}
