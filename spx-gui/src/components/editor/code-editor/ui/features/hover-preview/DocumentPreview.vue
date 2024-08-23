<script setup lang="ts">
import MarkdownPreview from '@/components/editor/code-editor/ui/MarkdownPreview.vue'
import { icon2SVG } from '@/components/editor/code-editor/ui/common'
import type { Action, RecommendAction } from '@/components/editor/code-editor/EditorUI'
defineProps<{
  content: string
  recommendAction?: RecommendAction
  moreActions?: Action[]
}>()

const emits = defineEmits<{
  close: []
}>()
let timer: number | null = null

function handleMouseEnter() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function handleMouseLeave() {
  // classic ts type matches error between Browser timer and Node.js timer, god knows why 2024 still has this problem.
  // overview: https://stackoverflow.com/questions/45802988/typescript-use-correct-version-of-settimeout-node-vs-window
  // here use force transformed type.
  // or use `ReturnType<typeof setTimeout>`
  timer = setTimeout(() => emits('close'), 500) as unknown as number
}
</script>

<template>
  <section class="document-preview" @mouseleave="handleMouseLeave" @mouseenter="handleMouseEnter">
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
  animation: documentEnter 0.15s ease;
  transform-origin: left top;

  // todo: make some way to trig this animation
  &.leave-animate {
    animation: documentLeave 0.15s ease;
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

@keyframes documentEnter {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
}

@keyframes documentLeave {
  to {
    opacity: 1;
    transform: scale(1) translateY(0px);
  }
}
</style>
