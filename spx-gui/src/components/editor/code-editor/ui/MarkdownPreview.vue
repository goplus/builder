<script setup lang="ts">
import { renderMarkdown } from './common/languages'

defineProps<{
  content: string
}>()
</script>

<template>
  <article class="markdown-preview">
    <header class="header"></header>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <main class="main" v-html="renderMarkdown(content)"></main>
    <footer class="footer"></footer>
  </article>
</template>
<style lang="scss">
.markdown-preview .main {
  .hljs,
  .shiki {
    padding: 8px;
    margin: 4px 0;
    background-color: rgba(229, 229, 229, 0.4) !important;
    border-radius: 5px;
    font-family: 'JetBrains Mono NL', Consolas, 'Courier New', monospace;
    line-height: 1.3;
  }
}
</style>

<style scoped lang="scss">
.markdown-preview {
  min-width: 400px;
  background: white;
  border-radius: 5px;
  color: black;
  font-size: 14px;
  border: 1px solid #a6a6a6;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  font-family:
    AlibabaHealthB,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    'Noto Sans',
    sans-serif,
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji';
  line-height: 2;

  .main {
    padding: 8px;
  }
}
</style>
