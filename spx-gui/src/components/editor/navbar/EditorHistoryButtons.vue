<script lang="ts">
// Shared Tailwind classes of the undo/redo buttons. Hoisted into a plain `<script>` block so the constant is
// created once per module (not per component instance) while still being referenced from the template.
const historyBtnClz =
  'h-full flex items-center justify-center border-none bg-transparent px-3 text-inherit outline-none disabled:cursor-not-allowed disabled:text-grey-600 enabled:cursor-pointer enabled:hover:bg-grey-400'
</script>

<script setup lang="ts">
/**
 * Purpose: undo/redo buttons for the Project Editor's edit history. Extracted from `EditorNavbar.vue` so the
 * Course Editor can show the same controls in its own navbar while the embedded learner project is open.
 *
 * Props:
 * - `state` - The `EditorState` whose `history` is undone/redone; null while no project editor is active
 *   (both buttons are then disabled, because there is no undo/redo action to show).
 *
 * Emits: none (undo/redo are applied directly on `state.history`).
 *
 * Used by: components/editor/navbar/EditorNavbar.vue#template (left slot),
 * components/course-editor/CourseEditor.vue#template (left slot, only when `doc.type === 'project'`).
 *
 * Uses: components/ui (`UIIcon`, `UITooltip`), components/editor/editor-state.ts (`EditorState.history`),
 * components/editor/history.ts (`History.getUndoAction`, `getRedoAction`, `undo`, `redo`),
 * utils/exception (`useMessageHandle`).
 */
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { UIIcon, UITooltip } from '@/components/ui'
import type { EditorState } from '../editor-state'

const props = defineProps<{
  state: EditorState | null
}>()

/**
 * The action that would be undone next; null when the history is at its first state, undefined when there is
 * no editor state at all. Both falsy cases disable the undo button.
 * @returns `Action` (with a bilingual `name`), or null/undefined.
 * Called by: EditorHistoryButtons.vue#undoText, EditorHistoryButtons.vue#template (`:disabled` bindings).
 */
const undoAction = computed(() => props.state?.history.getUndoAction())

/**
 * Tooltip text of the undo button: names the action when there is one, plain "Undo" otherwise.
 * @returns A `LocaleMessage` with `en` and `zh` variants.
 * Called by: EditorHistoryButtons.vue#template (`$t(undoText)`).
 */
const undoText = computed(() => ({
  en: undoAction.value != null ? `Undo "${undoAction.value.name.en}"` : 'Undo',
  zh: undoAction.value != null ? `撤销“${undoAction.value.name.zh}”` : '撤销'
}))

/**
 * The action that would be redone next; null when there is no later state, undefined when there is no editor
 * state at all. Both falsy cases disable the redo button.
 * @returns `Action` (with a bilingual `name`), or null/undefined.
 * Called by: EditorHistoryButtons.vue#redoText, EditorHistoryButtons.vue#template (`:disabled` bindings).
 */
const redoAction = computed(() => props.state?.history.getRedoAction())

/**
 * Tooltip text of the redo button: names the action when there is one, plain "Redo" otherwise.
 * @returns A `LocaleMessage` with `en` and `zh` variants.
 * Called by: EditorHistoryButtons.vue#template (`$t(redoText)`).
 */
const redoText = computed(() => ({
  en: redoAction.value != null ? `Redo "${redoAction.value.name.en}"` : 'Redo',
  zh: redoAction.value != null ? `重做“${redoAction.value.name.zh}”` : '重做'
}))

/**
 * Click handler of the undo button, wrapped by `useMessageHandle` so a failing undo shows an error toast instead
 * of an unhandled rejection. `handleUndo.fn` is the callable, `handleUndo.isLoading` the in-flight flag.
 * @returns Promise<void>; on success the history moves back one step and the project state is restored.
 * Called by: EditorHistoryButtons.vue#template (`@click="handleUndo.fn"`).
 */
const handleUndo = useMessageHandle(() => props.state?.history.undo(), {
  en: 'Failed to undo',
  zh: '撤销操作失败'
})

/**
 * Click handler of the redo button, wrapped by `useMessageHandle` so a failing redo shows an error toast.
 * `handleRedo.fn` is the callable, `handleRedo.isLoading` the in-flight flag.
 * @returns Promise<void>; on success the history moves forward one step and the project state is restored.
 * Called by: EditorHistoryButtons.vue#template (`@click="handleRedo.fn"`).
 */
const handleRedo = useMessageHandle(() => props.state?.history.redo(), {
  en: 'Failed to redo',
  zh: '重做操作失败'
})
</script>

<template>
  <div class="flex">
    <!-- Undo button with its tooltip. Both the button and the tooltip are disabled when there is nothing to
         undo (or no editor state), so hovering a dead button shows no hint. -->
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
    <!-- Redo button with its tooltip; same disabling rule as undo, driven by `redoAction`. -->
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
