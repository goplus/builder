/**
 * @file SPX utils
 * @desc definition or helpers for spx language
 */

import { File } from '@/models/common/file'
import { getMimeFromExt } from './file'
import { stripExt } from './path'
import { toWav } from './audio'

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
 * Adapt audio file to fit spx.
 * 
 * Currently spx supports `mp3` and `wav` only (see details in https://github.com/goplus/spx/blob/7f46dc7879e2320a9889f1396b9e592efb6d888d/audio.go),
 * it seems that wav-encoding is simpler than mp3-encoding. So we convert unsupported audio files to wav before added to project.
 * 
 * Note: wav with codec `adpcm` is supported by spx, while not natively supported by chrome (& maybe more other browsers).
 * So it is allowed to add a sound of wav file with codec `adpcm` to project, and it works in the game.
 * But it does not work as expected with audio element (`SoundPlayer`) & wavesurfer.
 */
export async function adaptAudio(file: File): Promise<File> {
  if (file.type === getMimeFromExt('mp3')) return file
  if (file.type === getMimeFromExt('wav')) return file

  const wavAb = await toWav(await file.arrayBuffer())
  const wavFileName = stripExt(file.name) + '.wav'
  return new File(wavFileName, async () => wavAb)
}
