<template>
  <UIDropdown v-if="tool.usage == null" trigger="click" placement="top-start">
    <template #trigger>
      <div>
        <UITooltip placement="top-start">
          {{ $t(tool.desc) }}
          <template #trigger>
            <UITagButton>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="icon" v-html="getIcon(tool)"></div>
              <span class="text">{{ tool.keyword }}</span>
            </UITagButton>
          </template>
        </UITooltip>
      </div>
    </template>
    <UIMenu>
      <UIMenuItem v-for="(usage, k) in tool.usages" :key="k" @click="emit('useSnippet', usage.insertText)">
        {{ $t(usage.desc) + $t({ en: ': ', zh: '：' }) }}
        <UICode>{{ usage.sample }}</UICode>
      </UIMenuItem>
    </UIMenu>
  </UIDropdown>
  <UITooltip v-else placement="top-start">
    {{ $t(tool.desc) + $t({ en: ', e.g.', zh: '，示例：' }) }}
    <UICode>{{ tool.usage.sample }}</UICode>
    <template #trigger>
      <UITagButton @click="emit('useSnippet', tool.usage.insertText)">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="icon" v-html="getIcon(tool)"></div>
        <span class="text">{{ tool.keyword }}</span>
      </UITagButton>
    </template>
  </UITooltip>
</template>

<script setup lang="ts">
import { UITagButton, UITooltip, UIDropdown, UIMenu, UIMenuItem, UICode } from '@/components/ui'
import { ToolType, ToolCallEffect, type Tool } from './code-text-editor'
import iconRead from './icons/read.svg?raw'
import iconEffect from './icons/effect.svg?raw'
import iconListen from './icons/listen.svg?raw'
import iconCode from './icons/code.svg?raw'

defineProps<{
  tool: Tool
}>()

const emit = defineEmits<{
  useSnippet: [insertText: string]
}>()

function getIcon(tool: Tool) {
  if ([ToolType.constant, ToolType.variable].includes(tool.type)) return iconRead
  if ([ToolType.function, ToolType.method].includes(tool.type)) {
    if (tool.callEffect === ToolCallEffect.listen) return iconListen
    if (tool.callEffect === ToolCallEffect.read) return iconRead
    if (tool.callEffect === ToolCallEffect.write) return iconEffect
  }
  return iconCode
}
</script>

<style scoped lang="scss">
.icon {
  margin-right: 4px;
  width: 16px;
  height: 16px;
  color: var(--ui-color-yellow-main);
}
.text {
  max-width: 9em;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
}
</style>
