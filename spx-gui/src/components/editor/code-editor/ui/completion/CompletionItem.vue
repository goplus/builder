<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import DefinitionIcon from '../definition/DefinitionIcon.vue'
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
  <li ref="wrapperRef" class="completion-item" :class="{ active }">
    <DefinitionIcon class="icon" :kind="item.kind" />
    <code class="code"
      ><span v-for="(part, i) in parts" :key="i" :class="{ matched: part.isMatched }">{{ part.content }}</span></code
    >
  </li>
</template>

<style lang="scss" scoped>
.completion-item {
  min-width: 8em;
  display: flex;
  align-items: center;
  padding: 7px;
  border-radius: var(--ui-border-radius-1);
  cursor: pointer;
  font-size: 12px;
  color: var(--ui-color-grey-1000);
  &:hover {
    background: var(--ui-color-grey-300);
  }
  &.active {
    background: var(--ui-color-grey-400);
  }
}

.icon {
  margin-right: 8px;
}

.code {
  font-family: var(--ui-font-family-code);
}

.matched {
  // TODO: reconfirm color here
  color: var(--ui-color-primary-main);
}
</style>
