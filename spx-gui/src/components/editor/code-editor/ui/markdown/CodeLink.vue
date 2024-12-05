<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useI18n } from '@/utils/i18n'
import type { Range, Position } from '../../common'
import { getCodeFilePath } from '../common'

const props = defineProps<{
  /** Text document URI, e.g., `file:///NiuXiaoQi.spx` */
  file: string
  /** `${line},${column}`, e.g., `10,20` */
  position?: string
  /** `${startLine},${startColumn}-${endLine}${endColumn}`, e.g., `10,20-12,10` */
  range?: string
}>()

const slots = useSlots()
const i18n = useI18n()

const file = computed(() => {
  const codeFilePath = getCodeFilePath(props.file)
  return codeFilePath.replace(/\.spx$/, '')
})

function parsePosition(positionStr: string): Position {
  const [line, column] = positionStr.split(',').map((p) => parseInt(p.trim(), 10))
  return { line, column }
}

const position = computed<Position | null>(() => {
  if (props.position == null || props.position === '') return null
  return parsePosition(props.position)
})

const range = computed<Range | null>(() => {
  if (props.range == null || props.range === '') return null
  const [start, end] = props.range.split('-').map(parsePosition)
  return { start, end }
})

const text = computed(() => {
  if (slots.default != null) {
    const content = slots.default()
    if (content.length > 0) return content
  }
  if (position.value != null)
    return i18n.t({
      en: `${file.value}: Line ${position.value.line} Col ${position.value.column}`,
      zh: `${file.value}: 第 ${position.value.line} 行 第 ${position.value.column} 列`
    })
  if (range.value != null) {
    const { start, end } = range.value
    if (start.line === end.line) {
      return i18n.t({
        en: `${file.value}: Line ${start.line} Col ${start.column}-${end.column}`,
        zh: `${file.value}: 第 ${start.line} 行 第 ${start.column}-${end.column} 列`
      })
    } else {
      return i18n.t({
        en: `${file.value}: Line ${start.line}-${end.line}`,
        zh: `${file.value}: 第 ${start.line}-${end.line} 行`
      })
    }
  }
  throw new Error('Either `position` or `range` must be provided')
})

function handleClick() {
  console.warn('TODO: Open file in editor', position.value ?? range.value)
}
</script>

<template>
  <a class="code-link" href="javascript:;" @click.prevent="handleClick">{{ text }}</a>
</template>

<style lang="scss" scoped>
@import '@/components/ui/link.scss';

.code-link {
  @include link(boring);
}
</style>
