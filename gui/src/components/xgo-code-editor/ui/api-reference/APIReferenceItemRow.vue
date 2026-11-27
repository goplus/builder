<script setup lang="ts">
import { useMessageHandle } from '@/utils/exception'
import { setDdiDragData } from '../../common'
import { useCodeEditor } from '../../context'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import DefinitionOverviewWrapper from '../definition/DefinitionOverviewWrapper.vue'
import type { APIReferenceItem } from '.'

const props = defineProps<{
  item: APIReferenceItem
  snippetPreview: { overview: string; inlayHints: string }
  blockStyle?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  /** Emitted on mouse down or drag start so the browsing item can close its hover card. */
  interaction: []
}>()
const codeEditor = useCodeEditor()
const codeEditorUICtx = useCodeEditorUICtx()

const handleInsert = useMessageHandle(
  () => {
    if (props.disabled) return
    return codeEditor.history.doAction({ name: { en: 'Insert code', zh: '插入代码' } }, () =>
      codeEditorUICtx.ui.insertDefinition(props.item)
    )
  },
  {
    en: 'Failed to insert',
    zh: '插入失败'
  }
).fn

// Apply styling class BEFORE the `dragstart` event triggers to ensure
// the visual effect is applied during dragging (just another weird Chrome requirement).
// So we add the class on `mousedown` and remove it after `dragstart` or on `mouseup`.
const beforeDraggingClz = 'before-dragging'

function handleDragStart(e: DragEvent) {
  const itemEl = e.currentTarget as HTMLElement
  setTimeout(() => itemEl.classList.remove(beforeDraggingClz), 0)
  setDdiDragData(e.dataTransfer!, props.item)
  emit('interaction')
}

function handleMouseDown(e: MouseEvent) {
  if (props.disabled) return
  const itemEl = e.currentTarget as HTMLElement
  itemEl.classList.add(beforeDraggingClz)
  emit('interaction')
}

function handleMouseUp(e: MouseEvent) {
  const itemEl = e.currentTarget as HTMLElement
  itemEl.classList.remove(beforeDraggingClz)
}
</script>

<template>
  <li
    v-radar="{
      name: 'api-reference',
      label: snippetPreview.overview,
      desc: '',
      attrs: {
        package: item.definition.package,
        name: item.definition.name,
        'overload-id': item.definition.overloadId
      }
    }"
    class="api-reference-item max-w-full self-start translate-x-0 bg-grey-100 px-1.5 select-none transition-all duration-200 [scroll-margin-bottom:16px] [scroll-margin-top:34px] [&.before-dragging]:bg-grey-300/60 [&.before-dragging_.overview]:opacity-60"
    :aria-disabled="disabled"
    :class="{
      'rounded-sm': !blockStyle,
      'cursor-not-allowed opacity-50': disabled,
      'cursor-pointer hover:bg-grey-300': !disabled,
      'block-style relative flex min-h-9 w-fit max-w-none items-center rounded-md border border-grey-500 py-1.5 pr-2.5 pl-6.5 shadow-[0_2px_8px_rgba(15,23,42,0.08)]':
        blockStyle,
      'hover:border-primary-main hover:bg-grey-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)]':
        blockStyle && !disabled,
      'cursor-grab [&.before-dragging]:cursor-grabbing': blockStyle && !disabled,
      '[&_.overview]:break-normal': blockStyle
    }"
    :draggable="!disabled"
    @dragstart="handleDragStart"
    @mousedown.passive="handleMouseDown"
    @mouseup.passive="handleMouseUp"
    @click="handleInsert"
  >
    <div :class="{ 'flex items-center gap-2': $slots.actions != null }">
      <DefinitionOverviewWrapper
        class="overview min-w-0 flex-[1_1_0] break-all pt-0.5 pb-px"
        :kind="item.kind"
        :inlay-hints="snippetPreview.inlayHints"
      >
        {{ snippetPreview.overview }}
      </DefinitionOverviewWrapper>
      <slot name="actions" />
    </div>
    <slot />
  </li>
</template>

<style scoped>
.api-reference-item.block-style::before {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 8px;
  height: 16px;
  content: '';
  background-image: radial-gradient(circle, var(--ui-color-grey-700) 1.5px, transparent 1.5px);
  background-size: 4px 5px;
  opacity: 0.65;
  transform: translateY(-50%);
}

.api-reference-item.block-style .overview :deep(> code) {
  overflow: visible;
  text-overflow: clip;
}

.overview :deep(> code) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ui-color-hint-2);
}
</style>
