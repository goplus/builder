import type { HLJSApi, Language, Mode } from 'highlight.js'
const CLASSNAME_PREFIX = 'hljs'
const RAINBOW_BRACKET_CLASSNAME_BASE = 'bracket-level'
const PRIMITIVE_CLASSNAME_BASE = `${CLASSNAME_PREFIX}-type`
function createRainbowBracketMode(): Mode {
  return {
    className: RAINBOW_BRACKET_CLASSNAME_BASE,
    variants: [
      {
        match: /\(/,
        className: RAINBOW_BRACKET_CLASSNAME_BASE
      },
      {
        match: /\)/,
        className: RAINBOW_BRACKET_CLASSNAME_BASE
      },
      {
        match: /\{/,
        className: RAINBOW_BRACKET_CLASSNAME_BASE
      },
      {
        match: /}/,
        className: RAINBOW_BRACKET_CLASSNAME_BASE
      },
      {
        match: /\[/,
        className: RAINBOW_BRACKET_CLASSNAME_BASE
      },
      {
        match: /]/,
        className: RAINBOW_BRACKET_CLASSNAME_BASE
      }
    ]
  }
}

function applyRainbowBrackets($container: HTMLElement) {
  const $brackets: HTMLSpanElement[] = Array.from(
    $container.querySelectorAll(`.${CLASSNAME_PREFIX}-${RAINBOW_BRACKET_CLASSNAME_BASE}`)
  )

  const expressionMap: Record<string, { level: number; stack: number[] }> = {
    '(': {
      level: 1,
      stack: []
    },
    '[': {
      level: 1,
      stack: []
    },
    '{': {
      level: 1,
      stack: []
    }
  }

  const transformToPair = (char: string) => {
    return (
      {
        ')': '(',
        ']': '[',
        '}': '{'
      }[char] || char
    )
  }

  for (let i = 0; i < $brackets.length; i++) {
    const char = $brackets[i].innerText
    if (['(', '[', '{'].includes(char)) {
      expressionMap[char].level++
      expressionMap[char].stack.push(i)
    } else if ([')', ']', '}'].includes(char)) {
      const pair = transformToPair(char)
      const lastIdx = expressionMap[pair].stack.pop()
      if (lastIdx === undefined) continue
      if (expressionMap[pair].stack.length === 0) expressionMap[pair].level = 1
      const level = ((expressionMap[pair].level - 1) % 5) + 1 // 5 means in css max level color. from [1-5] infinite loop

      const $left = $brackets[lastIdx]
      const $right = $brackets[i]
      $left.className = `${CLASSNAME_PREFIX}-${RAINBOW_BRACKET_CLASSNAME_BASE}-${level}`
      $right.className = `${CLASSNAME_PREFIX}-${RAINBOW_BRACKET_CLASSNAME_BASE}-${level}`
      expressionMap[pair].level--
    }
  }
}
function applyColorPrimitives($container: HTMLElement) {
  const $primitives: HTMLSpanElement[] = Array.from(
    $container.querySelectorAll(`.${PRIMITIVE_CLASSNAME_BASE}`)
  )
  // const primitiveTypeMap: Record<string, string> = {
  //   true: 'bool',
  //   false: 'bool',
  //   nil: 'nil',
  //   iota: 'int',
  //   nan: 'int',
  //   int8: 'int',
  //   int16: 'int',
  //   int32: 'int',
  //   int64: 'int',
  //   int128: 'int',
  //   uint8: 'uint',
  //   uint16: 'uint',
  //   uint32: 'uint',
  //   uint64: 'uint',
  //   uint128: 'uint',
  //   uintptr: 'uint',
  //   float32: 'float',
  //   float64: 'float',
  //   rune: 'string',
  //   bigint: 'bigint',
  //   bigrat: 'bigint',
  //   complex64: 'complex',
  //   complex128: 'complex'
  // }
  $primitives.forEach((primitive) => {
    // const rawType = primitive.innerText
    // const type = primitiveTypeMap[rawType] || rawType
    // primitive.className = `${PRIMITIVE_CLASSNAME_BASE}-${type}`
    primitive.className = PRIMITIVE_CLASSNAME_BASE
  })
}

// used for operator HTMLElement
const $container = document.createElement('code')

export function registerGoPlusLanguageHighlight(hljs: HLJSApi): Language {
  hljs.addPlugin({
    'after:highlight': (result) => {
      $container.innerHTML = result.value
      applyRainbowBrackets($container)
      result.value = $container.innerHTML
    }
  })

  hljs.addPlugin({
    'after:highlight': (result) => {
      $container.innerHTML = result.value
      applyColorPrimitives($container)
      result.value = $container.innerHTML
    }
  })
  const RAINBOW_BRACKET_MODE = createRainbowBracketMode()

  const LITERALS = ['true', 'false', 'iota', 'nil']
  const BUILT_INS = [
    'append',
    'cap',
    'close',
    'complex',
    'copy',
    'imag',
    'len',
    'make',
    'new',
    'panic',
    'print',
    'printf',
    'println',
    'real',
    'recover',
    'delete'
  ]
  const TYPES = [
    'bool',
    'byte',
    'complex64',
    'complex128',
    'error',
    'float32',
    'float64',
    'int8',
    'int16',
    'int32',
    'int64',
    'string',
    'uint8',
    'uint16',
    'uint32',
    'uint64',
    'int',
    'uint',
    'uintptr',
    'rune',
    // followings are go+ custom types
    'bigint',
    'bigrat',
    'any',
    'unsafe.Pointer'
  ]
  const KWS = [
    'break',
    'case',
    'chan',
    'const',
    'continue',
    'default',
    'defer',
    'else',
    'fallthrough',
    'for',
    'func',
    'go',
    'goto',
    'if',
    'import',
    'interface',
    'map',
    'package',
    'range',
    'return',
    'select',
    'struct',
    'switch',
    'type',
    'var'
  ]
  const KEYWORDS = {
    keyword: KWS,
    type: TYPES,
    literal: LITERALS,
    built_in: BUILT_INS
  }
  return {
    name: 'GoPlus',
    aliases: ['golangplus', 'goplus', 'gop', 'go+'],
    keywords: KEYWORDS,
    illegal: '</',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'string',
        variants: [
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          {
            begin: '`',
            end: '`'
          }
        ],
        contains: [hljs.BACKSLASH_ESCAPE]
      },
      {
        className: 'number',
        variants: [
          {
            match: /-?\b0[xX]\.[a-fA-F0-9](_?[a-fA-F0-9])*[pP][+-]?\d(_?\d)*i?/, // hex without a present digit before . (making a digit afterwards required)
            relevance: 0
          },
          {
            match:
              /-?\b0[xX](_?[a-fA-F0-9])+((\.([a-fA-F0-9](_?[a-fA-F0-9])*)?)?[pP][+-]?\d(_?\d)*)?i?/, // hex with a present digit before . (making a digit afterwards optional)
            relevance: 0
          },
          {
            match: /-?\b0[oO](_?[0-7])*i?/, // leading 0o octal
            relevance: 0
          },
          {
            match: /-?\b0[bB](_?[0-7])*i?/, // leading 0o octal
            relevance: 0
          },
          {
            match: /-?\.\d(_?\d)*([eE][+-]?\d(_?\d)*)?i?/, // decimal without a present digit before . (making a digit afterwards required)
            relevance: 0
          },
          {
            match: /-?\b\d(_?\d)*(\.(\d(_?\d)*)?)?([eE][+-]?\d(_?\d)*)?i?/, // decimal with a present digit before . (making a digit afterwards optional)
            relevance: 0
          }
        ]
      },
      {
        begin: /:=/ // relevance booster
      },
      {
        className: 'function',
        beginKeywords: 'func',
        end: '\\s*(\\{|$)',
        excludeEnd: true,
        contains: [
          hljs.TITLE_MODE,
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            endsParent: true,
            keywords: KEYWORDS,
            illegal: /["']/
          },
          RAINBOW_BRACKET_MODE
        ]
      },
      {
        className: 'operator',
        begin:
          /[=><!~?:&|+\-*/%^]+|==|<=|>=|!=|&&|\|\||\+\+|--|<<|>>|\+=|-=|\*=|\/=|&=|\|=|\^=|%=|<<=|>>=|=>/
      },
      RAINBOW_BRACKET_MODE
    ]
  }
}
