/**
 * @file Tools from gop
 */

import { type Tool, ToolType, ToolContext } from './common'

// TODO: more frequently-used tools for gop

export const forLoop: Tool = {
  type: ToolType.keyword,
  target: ToolContext.all,
  keyword: 'for',
  desc: { en: 'For loop', zh: '循环' },
  usages: [
    {
      desc: { en: 'Loop with condition', zh: '条件循环' },
      sample: 'for condition {}',
      insertText: 'for ${1:condition} {\n\t${2:}\n}'
    },
    {
      desc: { en: 'Loop with range', zh: '指定范围循环' },
      sample: 'for i <- start:end {}',
      insertText: 'for ${1:i} <- ${2:start}:${3:end} {\n\t${4:}\n}'
    },
    {
      desc: { en: 'Iterate within given set', zh: '遍历指定集合' },
      sample: 'for i, v := range set {}',
      insertText: 'for ${1:i}, ${2:v} := range ${3:set} {\n\t${4:}\n}'
    }
  ]
}

export const ifStatemeent: Tool = {
  type: ToolType.keyword,
  target: ToolContext.all,
  keyword: 'if',
  desc: { en: 'If statement', zh: '条件语句' },
  usages: [
    {
      desc: { en: 'If statement', zh: '条件语句' },
      sample: 'if condition {}',
      insertText: 'if ${1:condition} {\n\t${2:}\n}'
    },
    {
      desc: { en: 'If else statement', zh: '条件否则语句' },
      sample: 'if condition {} else {}',
      insertText: 'if ${1:condition} {\n\t${2:}\n} else {\n\t${3:}\n}'
    }
  ]
}

export const varDefinition: Tool = {
  type: ToolType.keyword,
  target: ToolContext.all,
  keyword: 'var',
  desc: { en: 'Define a variable', zh: '变量定义' },
  usage: {
    sample: 'var count int',
    insertText: 'var ${1:name} ${2:type}'
  }
}

export const functionDefinition: Tool = {
  type: ToolType.keyword,
  target: ToolContext.stage,
  keyword: 'func',
  desc: { en: 'Function definition', zh: '函数定义' },
  usage: {
    sample: 'func add(a int, b int) int {}',
    insertText: 'func ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}'
  }
}

export const println: Tool = {
  type: ToolType.function,
  target: ToolContext.all,
  keyword: 'println',
  desc: { en: 'Print line', zh: '打印行' },
  usage: {
    sample: 'println "Hello, world!"',
    insertText: 'println ${1}'
  }
}
