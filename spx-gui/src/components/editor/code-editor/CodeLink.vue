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

const defaultText = computed(() => {
  const { position, range } = props
  if (position != null)
    return i18n.t({
      en: `${codeFileName.value}: Line ${position.line} Col ${position.column}`,
      zh: `${codeFileName.value}: 第 ${position.line} 行 第 ${position.column} 列`
    })
  if (range != null) {
    const { start, end } = range
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
  throw new Error('Either `position` or `range` must be provided')
})

const handleClick = useMessageHandle(
  () => {
    const codeEditorCtx = codeEditorCtxRef.value
    if (codeEditorCtx == null) throw new Error('Code editor context is not available')
    const ui = codeEditorCtx.mustEditor().getAttachedUI()
    if (ui == null) return
    const { file, position, range } = props
    if (position != null) {
      ui.open(file, position)
      return
    }
    if (range != null) {
      ui.open(file, range)
      return
    }
    throw new Error('Either `position` or `range` must be provided')
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
