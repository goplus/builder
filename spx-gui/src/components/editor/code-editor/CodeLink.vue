<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { type Range, type Position, type TextDocumentIdentifier, textDocumentId2CodeFileName } from './common'
import { useCodeEditorCtxRef } from './context'

const props = defineProps<{
  file: TextDocumentIdentifier
  position?: Position
  range?: Range
}>()

const slots = useSlots()
const i18n = useI18n()
const codeEditorCtxRef = useCodeEditorCtxRef()

const codeFileName = computed(() => i18n.t(textDocumentId2CodeFileName(props.file)))

const positionOrRangeComputed = computed(() => {
  if (props.position != null) return { type: 'position' as const, value: props.position }
  if (props.range != null) return { type: 'range' as const, value: props.range }
  return { type: 'position' as const, value: { line: 1, column: 1 } }
})

const defaultText = computed(() => {
  const positionOrRange = positionOrRangeComputed.value
  if (positionOrRange.type === 'position') {
    const position = positionOrRange.value
    return i18n.t({
      en: `${codeFileName.value}: Line ${position.line} Col ${position.column}`,
      zh: `${codeFileName.value}: 第 ${position.line} 行 第 ${position.column} 列`
    })
  }
  if (positionOrRange.type === 'range') {
    const { start, end } = positionOrRange.value
    if (start.line === end.line) {
      return i18n.t({
        en: `${codeFileName.value}: Line ${start.line} Col ${start.column}-${end.column}`,
        zh: `${codeFileName.value}: 第 ${start.line} 行 第 ${start.column}-${end.column} 列`
      })
    } else {
      return i18n.t({
        en: `${codeFileName.value}: Line ${start.line}-${end.line}`,
        zh: `${codeFileName.value}: 第 ${start.line}-${end.line} 行`
      })
    }
  }
  throw new Error('Position or range expected')
})

const handleClick = useMessageHandle(
  () => {
    const codeEditorCtx = codeEditorCtxRef.value
    if (codeEditorCtx == null) throw new Error('Code editor context is not available')
    const ui = codeEditorCtx.mustEditor().getAttachedUI()
    if (ui == null) return
    const { file } = props
    const positionOrRange = positionOrRangeComputed.value
    if (positionOrRange.type === 'position') {
      ui.open(file, positionOrRange.value)
      return
    }
    if (positionOrRange.type === 'range') {
      ui.open(file, positionOrRange.value)
      return
    }
    throw new Error('Position or range expected')
  },
  { en: 'Failed to open code location', zh: '打开代码位置失败' }
).fn
</script>

<template>
  <a class="code-link" href="javascript:;" @click.prevent="handleClick">
    <template v-if="!!slots.default">
      <slot></slot>
    </template>
    <template v-else>
      {{ defaultText }}
    </template>
  </a>
</template>

<style lang="scss" scoped>
@import '@/components/ui/link.scss';

.code-link {
  @include link(boring);
}
</style>
