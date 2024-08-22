<script setup lang="ts">
import { renderMarkdown } from './common/languages'
import CopyIcon from './icons/copy.svg'
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import type { Action, RecommendAction } from '@/components/editor/code-editor/EditorUI'
import { icon2SVG } from '@/components/editor/code-editor/ui/common'
defineProps<{
  content: string
  recommendAction?: RecommendAction
  moreActions?: Action[]
}>()
const i18n = useI18n()
const copyIcon = computed(() => `url('${CopyIcon}')`)
const copyMessage = computed(() => `'${i18n.t({ zh: '已复制', en: 'Copied' })}'`)
</script>

<template>
  <article class="markdown-preview">
    <header class="header"></header>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <main class="main" v-html="renderMarkdown(content)"></main>
    <footer class="footer">
      <nav>
        {{ recommendAction?.label }}
        <button
          v-if="recommendAction?.activeLabel"
          class="highlight"
          @click="recommendAction.onActiveLabelClick()"
        >
          {{ recommendAction.activeLabel }}
        </button>
      </nav>
      <nav>
        <!--  todo: when has 2 more we need pop out a menu instead of current flat all actions  -->
        <button v-for="(action, i) in moreActions" :key="i" @click="action.onClick()">
          <!-- eslint-disable vue/no-v-html -->
          <span v-html="icon2SVG(action.icon)"></span>
        </button>
      </nav>
    </footer>
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

.markdown-preview__wrapper {
  position: relative;
}

.markdown-preview__copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  right: 8px;
  top: 6px;
  width: 22px;
  height: 22px;
  background-color: rgb(255, 255, 255);
  border: none;
  outline: none;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;

  &:active {
    background-color: rgb(250, 250, 250);
  }

  &::after {
    content: v-bind(copyIcon);
    transform: translateY(1px);
  }

  &.copied::before {
    content: v-bind(copyMessage);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: -4px;
    height: 100%;
    padding: 2px 4px;
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateX(-100%);
    pointer-events: none;
  }
}
</style>

<style scoped lang="scss">
// in most time, this component this will render under body element, so css variables is not available, here need set them(color, font, etc.) manually
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

  .footer {
    display: flex;
    justify-content: space-between;
    min-height: 32px;
    padding: 4px 12px;
    color: #787878;
    font-size: 12px;
    background: #fafafa;
    border-bottom-left-radius: 5px;
    border-bottom-right-radius: 5px;

    & button {
      cursor: pointer;
      font-size: inherit;
      outline: none;
      border: none;
      background-color: transparent;
    }

    & .highlight {
      color: #219ffc;
    }
  }
}
</style>
