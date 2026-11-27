<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { getMarkdownText } from '@/components/common/markdown-vue/MarkdownView'
import { UITooltip } from '@/components/ui'
import MoreActions from '../MoreActions.vue'
import type { InternalAction } from '../code-editor-ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import CommandIcon from '../command/CommandIcon.vue'
import type { APIReferenceItem } from '.'
import APIReferenceItemRow from './APIReferenceItemRow.vue'
import { useAPIReferenceItem } from './use-api-reference-item'

const props = defineProps<{
  item: APIReferenceItem
  disabled?: boolean
}>()

const { snippetPreview, actions } = useAPIReferenceItem(() => props.item)
const codeEditorUICtx = useCodeEditorUICtx()

const i18n = useI18n()
const description = computed(() => {
  const detail = props.item.detail.value
  return getMarkdownText(typeof detail === 'string' ? detail : i18n.t(detail))
})

const resolvedActions = computed(() =>
  actions.value.map((action) => codeEditorUICtx.ui.resolveAction(action)).filter((action) => action != null)
)
const primaryAction = computed(() => resolvedActions.value[0] ?? null)
const secondaryActions = computed(() => resolvedActions.value.slice(1))

const handleAction = useMessageHandle(
  (action: InternalAction) => {
    if (props.disabled) return
    return codeEditorUICtx.ui.executeCommand(action.command, ...action.arguments)
  },
  { en: 'Failed to execute command', zh: '执行命令失败' }
).fn
</script>

<template>
  <APIReferenceItemRow :item="item" :snippet-preview="snippetPreview" :disabled="disabled" class="search-result">
    <template #actions>
      <div
        v-if="primaryAction != null"
        class="actions flex shrink-0 items-center gap-1"
        draggable="true"
        @dragstart.stop.prevent
        @mousedown.stop
        @mouseup.stop
        @click.stop
      >
        <UITooltip>
          <template #trigger>
            <button
              v-radar="{ name: 'api-action', label: $t(primaryAction.title), desc: 'Run this API action' }"
              type="button"
              class="size-6 cursor-pointer flex items-center justify-center rounded-sm border-0 bg-transparent p-0 text-primary-main transition-colors enabled:hover:text-primary-400 enabled:active:text-primary-600 disabled:cursor-not-allowed disabled:text-disabled-text"
              :disabled="disabled"
              @click="handleAction(primaryAction)"
            >
              <CommandIcon :type="primaryAction.commandInfo.icon" aria-hidden="true" />
            </button>
          </template>
          {{ $t(primaryAction.title) }}
        </UITooltip>
        <MoreActions :actions="secondaryActions" :disabled="disabled" @select="handleAction" />
      </div>
    </template>
    <p class="mt-1 text-xs text-hint-1">{{ description }}</p>
  </APIReferenceItemRow>
</template>

<style scoped>
.search-result {
  align-self: stretch;
  padding-top: 4px;
  padding-bottom: 4px;
}
@media (hover: hover) and (pointer: fine) {
  .search-result .actions {
    opacity: 0;
    pointer-events: none;
  }
  .search-result:hover .actions,
  .search-result:focus-within .actions,
  .search-result .actions:has(button[aria-expanded='true']) {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
