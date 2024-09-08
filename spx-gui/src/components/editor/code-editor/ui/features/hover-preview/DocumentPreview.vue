<script setup lang="ts">
import MarkdownPreview from '@/components/editor/code-editor/ui/MarkdownPreview.vue'
import { icon2SVG, normalizeIconSize } from '@/components/editor/code-editor/ui/common'
import { type Action, Icon, type RecommendAction } from '@/components/editor/code-editor/EditorUI'
import { renderMarkdown } from '../../common/languages'

defineEmits<{
  'action-click': [action: Action]
}>()

defineProps<{
  header?: {
    icon: Icon
    declaration: string
  }
  content?: string
  recommendAction?: RecommendAction
  moreActions?: Action[]
}>()
</script>

<template>
  <section class="document-preview">
    <header v-if="header" class="declaration-wrapper">
      <!-- eslint-disable vue/no-v-html -->
      <span
        :ref="(el) => normalizeIconSize(el as Element, 18)"
        class="icon"
        v-html="icon2SVG(Icon.Function)"
      ></span>
      <span
        class="declaration"
        v-html="renderMarkdown('```gop pure\n' + header.declaration + '\n```')"
      ></span>
    </header>
    <MarkdownPreview v-if="content" class="markdown" :content="content"></MarkdownPreview>
    <footer class="actions-footer">
      <nav class="recommend">
        {{ recommendAction?.label }}
        <button
          v-if="recommendAction?.activeLabel"
          class="highlight"
          @click="recommendAction.onActiveLabelClick()"
        >
          {{ recommendAction.activeLabel }}
        </button>
      </nav>
      <nav class="more">
        <!--  todo: when has 2 more we need pop out a menu instead of current flat all actions  -->
        <!-- eslint-disable vue/no-v-html -->
        <button
          v-for="(action, i) in moreActions"
          :key="i"
          @click="$emit('action-click', action)"
          v-html="icon2SVG(action.icon)"
        ></button>
      </nav>
    </footer>
  </section>
</template>
<style lang="scss">
div[widgetid='editor.contrib.resizableContentHoverWidget'] {
  display: none !important;
}
</style>
<style lang="scss" scoped>
// for here is under body, not in #app, so can't use var(--ui-font-family-main)
.document-preview {
  min-width: 370px;
  background: white;
  border-radius: 5px;
  border: 1px solid #a6a6a6;
  color: black;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: 0.15s;
}

.declaration-wrapper {
  display: flex;
  align-items: center;
  margin: 10px 8px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e5e5;
  font-size: 14px;
  font-family: 'JetBrains Mono NL', Consolas, 'Courier New', 'AlibabaHealthB', monospace;

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0 4px;
    color: #faa135;
  }
}

.markdown {
  padding-top: 4px;
}

.actions-footer {
  display: flex;
  justify-content: space-between;
  min-height: 32px;
  padding: 4px 10px;
  color: #787878;
  font-size: 12px;
  background: #fafafa;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;

  .recommend,
  .more {
    display: flex;
    align-items: center;
  }

  button {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    padding: 0;
    color: inherit;
    font-size: inherit;
    outline: none;
    border: none;
    background-color: transparent;
  }

  .more {
    color: #a6a6a6;
    transition: color 0.15s;

    &:hover {
      color: #cacaca;
    }

    &:active {
      color: #979797;
    }
  }

  .highlight {
    margin: 0 4px;
    color: #219ffc;
    transition: color 0.15s;

    &:hover {
      color: #5e98f6;
    }

    &:active {
      color: #1e9dff;
    }
  }
}
</style>
