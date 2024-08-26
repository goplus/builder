<script setup lang="ts">
import MarkdownPreview from '@/components/editor/code-editor/ui/MarkdownPreview.vue'
import { icon2SVG } from '@/components/editor/code-editor/ui/common'
import type { Action, RecommendAction } from '@/components/editor/code-editor/EditorUI'
defineProps<{
  content: string
  recommendAction?: RecommendAction
  moreActions?: Action[]
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <section class="document-preview" @mouseleave="$emit('close')">
    <MarkdownPreview class="markdown" :content></MarkdownPreview>
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
          @click="action.onClick()"
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
.document-preview {
  min-width: 400px;
  background: white;
  border-radius: 5px;
  border: 1px solid #a6a6a6;
  color: black;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transform-origin: left top;
  transition: 0.15s;

  &.v-enter-active,
  &.v-leave-active {
    transition: 0.15s cubic-bezier(0, 1.25, 1, 1);
  }

  &.v-enter-from,
  &.v-leave-to {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
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
