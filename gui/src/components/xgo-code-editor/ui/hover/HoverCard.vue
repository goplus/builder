<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import type { Action } from '../../common'
import type { InternalAction } from '../code-editor-ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import ActionOverflowMenu from '../ActionOverflowMenu.vue'
import CodeEditorCard from '../CodeEditorCard.vue'
import ActionButton from './ActionButton.vue'

const props = defineProps<{
  actions: Action[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: []
  menuVisibleChange: [visible: boolean]
  dismiss: []
}>()

const codeEditorCtx = useCodeEditorUICtx()

const actions = computed(() => {
  return props.actions.map((action) => codeEditorCtx.ui.resolveAction(action)).filter((action) => action != null)
})

// Keep a fixed limit for now. Revisit fitting by width if action labels or card sizes make it necessary.
const maxInlineActions = 3
const inlineActions = computed(() => actions.value.slice(0, maxInlineActions))
const overflowActions = computed(() => actions.value.slice(maxInlineActions))

const handleAction = useMessageHandle(
  async (action: InternalAction) => {
    if (props.disabled) return
    await codeEditorCtx.ui.executeCommand(action.command, ...action.arguments)
    emit('action')
  },
  { en: 'Failed to execute command', zh: '执行命令失败' }
).fn
</script>

<template>
  <CodeEditorCard class="flex flex-col items-stretch p-2">
    <ul class="min-h-0 max-h-75 min-w-62.5 max-w-82 flex flex-col overflow-y-auto [scrollbar-width:thin]">
      <slot></slot>
    </ul>
    <footer v-if="actions.length > 0" class="mt-1.5 border-t border-dividing-line-2 px-2 pt-3.5 pb-2">
      <div class="flex w-0 min-w-full flex-wrap items-center gap-1">
        <ActionButton
          v-for="(action, i) in inlineActions"
          :key="i"
          class="shrink-0 whitespace-nowrap"
          :icon="action.commandInfo.icon"
          :disabled="disabled"
          @click="handleAction(action)"
        >
          {{ action.title }}
        </ActionButton>
        <ActionOverflowMenu
          :actions="overflowActions"
          :disabled="disabled"
          @visible-change="emit('menuVisibleChange', $event)"
          @select="handleAction"
          @dismiss="emit('dismiss')"
        />
      </div>
    </footer>
  </CodeEditorCard>
</template>
