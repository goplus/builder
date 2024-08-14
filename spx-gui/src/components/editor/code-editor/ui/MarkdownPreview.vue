<script setup lang="ts">
import { renderMarkdown } from '@/components/editor/code-editor/ui/common/languages'

const props = defineProps<{
  content: string
}>()
</script>

<template>
  <article class="preview-card">
    <header class="preview-card__header"></header>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <main class="preview-card__main preview-markdown" v-html="renderMarkdown(props.content)"></main>
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

  .shiki {
    padding: 8px;
    margin: 4px 0;
    background-color: rgba(229, 229, 229, 0.4);
    border-radius: 5px;
    font-family: 'JetBrains Mono NL', 'Microsoft YaHei UI', Consolas, 'Courier New', monospace;
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
