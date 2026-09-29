<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useContentSize } from '@/utils/dom'
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
const contentListRef = ref<HTMLElement | null>(null)
const actionListRef = ref<HTMLElement | null>(null)
const actionListSize = useContentSize(actionListRef)

const cardWidth = computed(() => {
  const defaultWidth = 344
  const horizontalPadding = 32
  return Math.min(520, Math.max(defaultWidth, (actionListSize.value?.width ?? 0) + horizontalPadding))
})

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

function scrollToTranslation(contentIndex: number) {
  const contentList = contentListRef.value
  if (contentList == null) return
  const target = contentList.querySelector<HTMLElement>(`[data-editor-translation-index="${contentIndex}"]`)
  if (target == null) return
  const top = target.getBoundingClientRect().top - contentList.getBoundingClientRect().top + contentList.scrollTop
  contentList.scrollTo({ top, behavior: 'smooth' })
}

defineExpose({ scrollToTranslation })
</script>

<template>
  <CodeEditorCard
    class="hover-card flex flex-col items-stretch p-2"
    :style="{ '--hover-card-width': `${cardWidth}px` }"
  >
    <ul ref="contentListRef" class="hover-card-content-list flex flex-col gap-4">
      <slot></slot>
    </ul>
    <footer
      v-if="actions.length > 0"
      class="mt-1.5 flex flex-none gap-3 border-t border-dividing-line-2 px-2 pt-3.5 pb-2"
    >
      <div ref="actionListRef" class="w-max flex flex-none gap-3">
        <ActionButton
          v-for="(action, i) in actions"
          :key="i"
          class="flex-none"
          :icon="action.commandInfo.icon"
          @click="handleAction(action)"
        >
          {{ action.title }}
        </ActionButton>
      </div>
    </footer>
  </CodeEditorCard>
</template>

<style scoped>
.hover-card {
  width: min(var(--hover-card-width), calc(100vw - 24px));
  max-width: min(520px, calc(100vw - 24px));
}

.hover-card-content-list {
  width: 100%;
  min-height: 0;
  max-height: 300px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
</style>
