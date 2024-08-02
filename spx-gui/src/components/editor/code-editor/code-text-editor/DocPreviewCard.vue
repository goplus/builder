<script setup lang="ts">
// attention! current file is in testing! test like: custom markdown theme, custom Markdown syntax, etc.
// no need to review.
import markdownit from 'markdown-it'
import hljs from 'highlight.js'

const content = `\`\`\`spx
setYpos (Y: float32)
\`\`\`
---
移动到指定位置

使用示例：
\`\`\`spx
// 按下键盘上的按键时，精灵将往上移动
onKey Keyup, => {
    setYpos ypos + 1
}
\`\`\`
`
hljs.registerLanguage('spx', function (hljs) {
  const keywords = [
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

  const typeKeywords = [
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

  const operators = [
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

  return {
    name: 'spx',
    aliases: ['spx'],
    keywords: {
      keyword: keywords.join(' '),
      type: typeKeywords.join(' ')
    },
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.APOS_STRING_MODE,
      hljs.NUMBER_MODE,
      {
        // operators
        className: 'operator',
        begin: /=>/
      },
      {
        // operators
        className: 'operator',
        begin: /[=><!~?:&|+\-*/^%]+/
      },
      {
        // brackets
        className: 'bracket',
        begin: /[{}[\]()]/
      },
      {
        // type identifiers
        className: 'type',
        begin: /\b[A-Z][\w$]*\b/
      },
      {
        // identifiers
        className: 'identifier',
        begin: /\b[a-z_$][\w$]*\b/
      }
    ]
  }
})

const md = markdownit({
  highlight: function (str, lang): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        let content = `<pre class="hljs"><code>${
          hljs.highlight(str, {
            ignoreIllegals: true,
            language: lang
          }).value
        }</code></pre>`
        content = content.replace(
          '<span class="hljs-operator">=&amp;</span><span class="hljs-identifier">gt</span>;',
          `<span class="hljs-operator">=&gt;</span>`
        )
        return content
      } catch (e) {
        console.warn(e)
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</ code></ pre>'
  }
})

// md.renderer.rules.fence = function (tokens, idx, options, env, self) {
//   const token = tokens[idx]
//   const langClass = token.info ? `class="language-${token.info.trim()}"` : ''
//   const code = token.content
//   debugger
//
//   return `
//         <div class="code-block">
//           <pre ${langClass}><code>${md.utils.escapeHtml(code)}</code></pre>
//           <button class="copy-button" onclick="copyToClipboard(this)">Copy</button>
//         </div>
//       `
// }
const result = md.render(md.utils.escapeHtml(content))

window.copyToClipboard = copyToClipboard

function copyToClipboard(button: HTMLButtonElement) {
  if (!button.previousElementSibling) return
  const codeBlock = button.previousElementSibling
  const code = codeBlock.textContent || ''
  navigator.clipboard
    .writeText(code)
    .then(() => {
      button.textContent = 'Copied!'
      setTimeout(() => {
        button.textContent = 'Copy'
      }, 2000)
    })
    .catch((err) => {
      console.error('Failed to copy: ', err)
    })
}
</script>

<template>
  <article class="preview-card">
    <header class="preview-card__header"></header>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <main class="preview-card__main preview-markdown" v-html="result"></main>
    <footer class="preview-card__footer"></footer>
  </article>
</template>
<style>
@import url(//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.0/styles/github.min.css);
</style>
<style lang="scss">
.preview-markdown {
  .code-block {
    position: relative;
  }
  .copy-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #007bff;
    color: white;
    border: none;
    padding: 5px;
    cursor: pointer;
  }

  pre {
    padding: 8px;
    margin: 4px 0;
    background-color: rgba(229, 229, 229, 0.4);
    border-radius: 5px;
  }

  hr {
    border-color: rgba(229, 229, 229, 0.2);
  }
}
</style>

<style lang="scss">
.preview-card {
  width: 400px;
  background: white;
  border-radius: 5px;
  color: black;
  font-size: 12px;
  border: 1px solid #a6a6a6;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.preview-card__header {
  display: none;
  padding: 8px 0 4px;
  margin: 0 8px;
  border-bottom: 1px solid #a6a6a6;
}

.preview-card__main {
  padding: 8px;
}
</style>
