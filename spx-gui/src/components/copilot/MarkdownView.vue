<script lang="ts">
function getComponents(copilot: Copilot): Components {
  const customComponents: Record<string, Component> = {}
  const customRawComponents: Record<string, Component> = {}

  copilot.getCustomElements().forEach((tool) => {
    if (tool.isRaw) {
      customRawComponents[tool.tagName] = tool.component
      return
    }
    customComponents[tool.tagName] = tool.component
  })
  return {
    codeBlock: CodeBlock,
    custom: customComponents,
    customRaw: customRawComponents
  }
}

export function findCustomComponentUsages(value: string, copilot: Copilot) {
  const components = getComponents(copilot)
  return fccu({ value, components })
}
</script>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import MarkdownView, {
  findCustomComponentUsages as fccu,
  type Components
} from '@/components/common/markdown-vue/MarkdownView'
import CodeBlock from './custom-elements/CodeBlock.vue'
import { useCopilot } from './CopilotRoot.vue'
import type { Copilot } from './copilot'

defineProps<{
  value: string
}>()

const copilot = useCopilot()
const components = computed(() => getComponents(copilot))

// TODO: prevent html node rendering before complete
</script>

<template>
  <MarkdownView class="markdown-view" :value="value" :components="components" />
</template>

<style lang="scss" scoped>
.markdown-view {
  display: flex;
  flex-direction: column;
  gap: 1em;

  font-size: 12px;
  line-height: 1.75;
  color: inherit;

  :deep(h1, h2, h3, h4, h5, h6) {
    margin: 1em 0;
    color: var(--ui-color-title);
  }

  :deep(h1) {
    font-size: 20px;
    line-height: 1.4;
  }

  :deep(h2) {
    font-size: 16px;
    line-height: 1.625;
  }

  :deep(h3) {
    font-size: 14px;
    line-height: 1.57143;
  }

  :deep(h4, h5, h6) {
    font-size: 13px;
    line-height: 1.53846;
  }

  :deep(ul),
  :deep(ol) {
    display: flex;
    flex-direction: column;
    padding-left: 1.5em;
    gap: 8px;
  }
  :deep(ul) {
    list-style: square;
  }
  :deep(ol) {
    list-style: decimal;
  }
  :deep(li > *:not(:last-child)) {
    margin-bottom: 8px;
  }

  :deep(a) {
    color: inherit;
    text-decoration: underline;
    &:hover,
    &:active {
      color: var(--ui-color-primary-main);
    }
  }

  :deep(blockquote) {
    position: relative;
    padding-left: 20px;
    &:before {
      content: '';
      position: absolute;
      left: 9px;
      top: 0;
      width: 2px;
      height: 100%;
      border-radius: 1px;
      background-color: var(--ui-color-grey-800);
    }
  }

  :deep(code) {
    font-family: var(--ui-font-family-code);
  }
  :deep(:not(pre) > code) {
    // TODO: keep consistent with component `UICode`
    font-size: 0.83em;
    line-height: 1.6;
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid var(--ui-color-grey-500);
    background: var(--ui-color-grey-300);
    word-break: break-word;
    overflow-wrap: break-word;
  }

  :deep(strong) {
    font-weight: bold;
  }
}
</style>
