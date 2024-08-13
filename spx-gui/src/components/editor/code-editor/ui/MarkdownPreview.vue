<script setup lang="ts">
// attention! current file is in testing! test like: custom Markdown theme, custom Markdown syntax, etc.
// no need to review.
import markdownit from 'markdown-it'
import hljs from 'highlight.js'
// import 'highlight.js/styles/github.min.css'
import './common/languages/highlight-builder.css'
import { ref, watchEffect } from 'vue'
import { registerGoPlusLanguageHighlight } from '@/components/editor/code-editor/ui/common/languages/language-go+'

const props = defineProps<{
  content: string
}>()

// const content = SampleDoc
hljs.registerLanguage('go+', registerGoPlusLanguageHighlight)
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
        return content
      } catch (e) {
        console.warn(e)
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
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

const result = ref('')

watchEffect(() => {
  result.value = md.render(props.content)
})

// window.copyToClipboard = copyToClipboard
//
// function copyToClipboard(button: HTMLButtonElement) {
//   if (!button.previousElementSibling) return
//   const codeBlock = button.previousElementSibling
//   const code = codeBlock.textContent || ''
//   navigator.clipboard
//     .writeText(code)
//     .then(() => {
//       button.textContent = 'Copied!'
//       setTimeout(() => {
//         button.textContent = 'Copy'
//       }, 2000)
//     })
//     .catch((err) => {
//       console.error('Failed to copy: ', err)
//     })
// }
</script>

<template>
  <article class="preview-card">
    <header class="preview-card__header"></header>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <main class="preview-card__main preview-markdown" v-html="result"></main>
    <footer class="preview-card__footer"></footer>
  </article>
</template>
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
  min-width: 400px;
  background: white;
  border-radius: 5px;
  color: black;
  font-size: 14px;
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
