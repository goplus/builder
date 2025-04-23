<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { Action } from '../../common'
import type { InternalAction } from '../code-editor-ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import CodeEditorCard from '../CodeEditorCard.vue'
import ActionButton from './ActionButton.vue'

const props = defineProps<{
  actions: Action[]
}>()

const emit = defineEmits<{
  action: []
}>()

const codeEditorCtx = useCodeEditorUICtx()

const actions = computed(() => {
  return props.actions.map((a) => codeEditorCtx.ui.resolveAction(a)).filter((a) => a != null) as InternalAction[]
})

const handleAction = useMessageHandle(
  async (action: InternalAction) => {
    await codeEditorCtx.ui.executeCommand(action.command, ...action.arguments)
    emit('action')
  },
  { en: 'Failed to execute command', zh: '执行命令失败' }
).fn
</script>

<template>
  <CodeEditorCard class="hover-card">
    <ul class="body">
      <slot></slot>
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
  width: 328px;
  min-height: 0;
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.footer {
  margin-top: 6px;
  padding: 14px 8px 8px;
  display: flex;
  gap: 12px;
  border-top: 1px solid var(--ui-color-dividing-line-2);
}
</style>
