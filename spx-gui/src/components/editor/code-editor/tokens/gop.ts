/**
 * @file Tokens from gop
 */

import { type Token } from './common'

export const forLoop: Token = {
  id: {
    name: 'for',
    module: 'gop'
  },
  usages: [
    {
      id: '0',
      effect: '',
      declaration: 'Loop with condition',
      sample: 'for condition {}',
      insertText: 'for ${1:condition} {\n\t${2:}\n}'
    },
    {
      id: '1',
      effect: '',
      declaration: 'Loop with range',
      sample: 'for i <- start:end {}',
      insertText: 'for ${1:i} <- ${2:start}:${3:end} {\n\t${4:}\n}'
    },
    {
      id: '2',
      effect: '',
      declaration: 'Iterate within given set',
      sample: 'for i, v := range set {}',
      insertText: 'for ${1:i}, ${2:v} := range ${3:set} {\n\t${4:}\n}'
    }
  ]
}

export const ifStatement: Token = {
  id: {
    name: 'if',
    module: 'gop'
  },
  usages: [
    {
      id: '0',
      effect: '',
      declaration: 'If statement',
      sample: 'if condition {}',
      insertText: 'if ${1:condition} {\n\t${2:}\n}'
    },
    {
      id: '1',
      effect: '',
      declaration: 'If-else statement',
      sample: 'if condition {} else {}',
      insertText: 'if ${1:condition} {\n\t${2:}\n} else {\n\t${3:}\n}'
    }
  ]
}

export const varDefinition: Token = {
  id: {
    name: 'var',
    module: 'gop'
  },
  usages: [
    {
      id: '0',
      effect: '',
      declaration: 'Variable definition',
      sample: 'var count int',
      insertText: 'var ${1:name} ${2:type}'
    }
  ]
}

export const functionDefinition: Token = {
  id: {
    name: 'func',
    module: 'gop'
  },
  usages: [
    {
      id: '0',
      effect: '',
      declaration: 'Function definition',
      sample: 'func add(a int, b int) int {}',
      insertText: 'func ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}'
    }
  ]
}

export const println: Token = {
  id: {
    name: 'println',
    module: 'gop'
  },
  usages: [
    {
      id: '0',
      effect: '',
      declaration: 'println',
      sample: 'println "Hello, world!"',
      insertText: 'println ${1}'
    }
  ]
}
