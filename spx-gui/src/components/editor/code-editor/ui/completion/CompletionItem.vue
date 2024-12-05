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
  const matches = createMatches(props.item.score)
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
  <li ref="wrapperRef" class="completion-item" :class="{ active }">
    <!-- TODO: icon -->
    <span v-for="(part, i) in parts" :key="i" :class="{ matched: part.isMatched }">{{ part.content }}</span>
  </li>
</template>

<style lang="scss" scoped>
.completion-item {
  padding: 0.5em;
  cursor: pointer;
  &:hover {
    background-color: #ccc;
  }
  &.active {
    background-color: #aaa;
  }
}

.completion-item + .completion-item {
  border-top: 1px solid #ccc;
}

.matched {
  color: red;
}
</style>
