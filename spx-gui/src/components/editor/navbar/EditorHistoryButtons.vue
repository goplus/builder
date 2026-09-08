<script lang="ts">
const historyBtnClz =
  'h-full flex items-center justify-center border-none bg-transparent px-3 text-inherit outline-none disabled:cursor-not-allowed disabled:text-grey-600 enabled:cursor-pointer enabled:hover:bg-grey-400'
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { UIIcon, UITooltip } from '@/components/ui'
import type { EditorState } from '../editor-state'

const props = defineProps<{
  state: EditorState | null
}>()

const undoAction = computed(() => props.state?.history.getUndoAction())

const undoText = computed(() => ({
  en: undoAction.value != null ? `Undo "${undoAction.value.name.en}"` : 'Undo',
  zh: undoAction.value != null ? `撤销“${undoAction.value.name.zh}”` : '撤销'
}))

const redoAction = computed(() => props.state?.history.getRedoAction())

const redoText = computed(() => ({
  en: redoAction.value != null ? `Redo "${redoAction.value.name.en}"` : 'Redo',
  zh: redoAction.value != null ? `重做“${redoAction.value.name.zh}”` : '重做'
}))

const handleUndo = useMessageHandle(() => props.state?.history.undo(), {
  en: 'Failed to undo',
  zh: '撤销操作失败'
})

const handleRedo = useMessageHandle(() => props.state?.history.redo(), {
  en: 'Failed to redo',
  zh: '重做操作失败'
})
</script>

<template>
  <div class="flex">
    <UITooltip :disabled="undoAction == null">
      <template #trigger>
        <button
          v-radar="{ name: 'Undo button', desc: 'Click to undo the last edit' }"
          :class="historyBtnClz"
          :disabled="undoAction == null"
          @click="handleUndo.fn"
        >
          <UIIcon class="h-5 w-5" type="undo" />
        </button>
      </template>
      <span>{{ $t(undoText) }}</span>
    </UITooltip>
    <UITooltip :disabled="redoAction == null">
      <template #trigger>
        <button
          v-radar="{ name: 'Redo button', desc: 'Click to redo the last undone edit' }"
          :class="historyBtnClz"
          :disabled="redoAction == null"
          @click="handleRedo.fn"
        >
          <UIIcon class="h-5 w-5" type="redo" />
        </button>
      </template>
      <span>{{ $t(redoText) }}</span>
    </UITooltip>
  </div>
</template>
