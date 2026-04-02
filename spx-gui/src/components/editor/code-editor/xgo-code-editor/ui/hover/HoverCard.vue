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
  <CodeEditorCard class="flex flex-col items-stretch p-2">
    <ul class="flex min-h-0 min-w-62.5 max-w-82 flex-col overflow-y-auto [scrollbar-width:thin]">
      <slot></slot>
    </ul>
    <footer v-if="actions.length > 0" class="mt-1.5 flex gap-3 border-t border-dividing-line-2 px-2 pt-3.5 pb-2">
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
