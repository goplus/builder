/**
 * @file XGo utils
 * @desc definition or helpers for xgo language
 */

import { unicodeSafeSlice, upFirst } from '../utils'
import type { LocaleMessage } from '../i18n'

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
  // 50 should be enough, it will be hard to read with too long name
  // TODO: should we move the truncation to outer layer?
  return unicodeSafeSlice(result, 0, 50)
}
