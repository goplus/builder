/**
 * @file Snippets from gop
 */

import { type Snippet, SnippetType, SnippetTarget } from './common'

// TODO: more frequently-used snippets for gop

export const forLoop: Snippet = {
  type: SnippetType.keyword,
  target: SnippetTarget.all,
  label: 'for',
  desc: { en: 'For loop', zh: '循环' },
  insertText: 'for ${1:condition} {\n\t${2:}\n}'
}

export const forRange: Snippet = {
  type: SnippetType.keyword,
  target: SnippetTarget.all,
  label: 'for range',
  desc: { en: 'For loop with range', zh: '指定范围循环' },
  insertText: 'for ${1:i} <- ${2:start}:${3:end} {\n\t${4:}\n}'
}

export const forRangeSet: Snippet = {
  type: SnippetType.keyword,
  target: SnippetTarget.all,
  label: 'for range set',
  desc: { en: 'Iterate within given set', zh: '遍历指定集合' },
  insertText: 'for ${1:i}, ${2:v} := range ${3:set} {\n\t${4:}\n}'
}

export const ifStatemeent: Snippet = {
  type: SnippetType.keyword,
  target: SnippetTarget.all,
  label: 'if',
  desc: { en: 'If statement', zh: '条件语句' },
  insertText: 'if ${1:condition} {\n\t${2:}\n}'
}

export const ifElseStatemeent: Snippet = {
  type: SnippetType.keyword,
  target: SnippetTarget.all,
  label: 'if else',
  desc: { en: 'If else statement', zh: '条件否则语句' },
  insertText: 'if ${1:condition} {\n\t${2:}\n} else {\n\t${3:}\n}'
}

export const varDefinition: Snippet = {
  type: SnippetType.keyword,
  target: SnippetTarget.all,
  label: 'var',
  desc: { en: 'Variable definition', zh: '变量定义' },
  insertText: 'var ${1:name} ${2:type}'
}

// TODO: function definition doesn't work well in spx file?
// export const functionDefinition: Snippet = {
//   type: SnippetType.keyword,
//   target: SnippetTarget.all,
//   label: 'function',
//   desc: { en: 'Function definition', zh: '函数定义' },
//   insertText: 'func ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}'
// }

export const println: Snippet = {
  type: SnippetType.function,
  target: SnippetTarget.all,
  label: 'println',
  desc: { en: 'Print line', zh: '打印行' },
  insertText: 'println ${1}'
}
