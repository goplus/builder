<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import type { InternalCompletionItem } from '.'
import { createMatches } from './fuzzy'

const props = defineProps<{
  item: InternalCompletionItem
  active: boolean
}>()

type Part = {
  content: string
  isMatched: boolean
}

const parts = computed(() => {
  const matches = createMatches(props.item.score ?? undefined)
  const parts: Part[] = []
  let lastEnd = 0
  for (const match of matches) {
    if (match.start > lastEnd) {
      parts.push({ content: props.item.label.slice(lastEnd, match.start), isMatched: false })
    }
    parts.push({ content: props.item.label.slice(match.start, match.end), isMatched: true })
    lastEnd = match.end
  }
  if (lastEnd < props.item.label.length) {
    parts.push({ content: props.item.label.slice(lastEnd), isMatched: false })
  }
  return parts
})

const wrapperRef = ref<HTMLElement>()

watchEffect(() => {
  if (props.active) {
    wrapperRef.value?.scrollIntoView({ block: 'nearest' })
  }
})
</script>

<template>
  <li
    ref="wrapperRef"
    class="flex min-w-24 max-w-42 cursor-pointer items-center rounded-1 p-1.75 text-xs text-grey-1000 hover:bg-grey-300"
    :class="active ? 'bg-grey-400' : ''"
    :title="item.label"
  >
    <code class="min-w-0 flex-1 truncate font-code"
      ><span v-for="(part, i) in parts" :key="i" :class="part.isMatched ? 'text-primary-main' : ''">{{ part.content }}</span></code
    >
  </li>
</template>
