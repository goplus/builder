<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { InternalAction } from '../code-editor-ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import MarkdownView from '../markdown/MarkdownView.vue'
import CodeEditorCard from '../CodeEditorCard.vue'
import type { HoverController, InternalHover } from '.'
import ActionButton from './ActionButton.vue'

const props = defineProps<{
  hover: InternalHover
  controller: HoverController
}>()

const codeEditorCtx = useCodeEditorUICtx()

const actions = computed(() => {
  return props.hover.actions.map((a) => codeEditorCtx.ui.resolveAction(a)).filter((a) => a != null) as InternalAction[]
})

const handleAction = useMessageHandle(
  async (action: InternalAction) => {
    await codeEditorCtx.ui.executeCommand(action.command, ...action.arguments)
    props.controller.hideHover()
  },
  { en: 'Failed to execute command', zh: '执行命令失败' }
).fn
</script>

<template>
  <CodeEditorCard
    class="hover-card"
    @mouseenter="controller.emit('cardMouseEnter')"
    @mouseleave="controller.emit('cardMouseLeave')"
  >
    <ul class="body">
      <li v-for="(content, i) in hover.contents" :key="i" class="content">
        <MarkdownView v-bind="content" />
      </li>
    </ul>
    <footer v-if="actions.length > 0" class="footer">
      <ActionButton
        v-for="(action, i) in actions"
        :key="i"
        :icon="action.commandInfo.icon"
        @click="handleAction(action)"
      >
        {{ action.title }}
      </ActionButton>
    </footer>
  </CodeEditorCard>
</template>

<style lang="scss" scoped>
.hover-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 8px;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.content {
  width: 328px;
  padding: 6px 8px;
}

.footer {
  margin-top: 6px;
  padding: 14px 8px 8px;
  display: flex;
  gap: 12px;
  border-top: 1px solid var(--ui-color-dividing-line-2);
}
</style>
