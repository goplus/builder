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
  action: [action: InternalAction]
}>()

const codeEditorCtx = useCodeEditorUICtx()

const actions = computed(() => {
  return props.actions.map((a) => codeEditorCtx.ui.resolveAction(a)).filter((a) => a != null) as InternalAction[]
})

const handleAction = useMessageHandle(
  async (action: InternalAction) => {
    await codeEditorCtx.ui.executeCommand(action.command, ...action.arguments)
    emit('action', action)
  },
  { en: 'Failed to execute command', zh: '执行命令失败' }
).fn
</script>

<template>
  <CodeEditorCard class="hover-card flex flex-col items-stretch p-2">
    <ul class="hover-card-content-list min-w-62.5 flex flex-col gap-4">
      <slot></slot>
    </ul>
    <footer
      v-if="actions.length > 0"
      class="mt-1.5 flex flex-none gap-3 border-t border-dividing-line-2 px-2 pt-3.5 pb-2"
    >
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

<style scoped>
.hover-card {
  width: max-content;
  max-width: min(520px, calc(100vw - 24px));
}

.hover-card-content-list {
  width: 100%;
  min-height: 0;
  max-height: 300px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}
</style>
