<script lang="ts">
import { inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import { useAsyncComputed } from '@/utils/utils'

const imageSelectorCompactKey: InjectionKey<ComputedRef<boolean>> = Symbol('image-selector-compact')

export function useImageSelectorCompact(): ComputedRef<boolean> {
  const compact = inject(imageSelectorCompactKey, null)
  if (compact == null) throw new Error('imageSelectorCompactKey should be provided')
  return compact
}
</script>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { UIError } from '@/components/ui'
import { useContentSize } from '@/utils/dom'
import type { File } from '@/models/common/file'
import type { PhaseState } from '@/models/gen/common'

const props = defineProps<{
  state: PhaseState<File[]>
  selected: File | null
}>()

const emit = defineEmits<{
  select: [File]
}>()

const wrapperRef = ref<HTMLElement | null>(null)
const wrapperSize = useContentSize(wrapperRef)

const compactThreshold = 550
const compact = computed(() => {
  const width = wrapperSize.value?.width
  if (width == null) return false
  return width < compactThreshold
})

provide(imageSelectorCompactKey, compact)

function handleSelect(file: File) {
  emit('select', file)
}

const imagesLoaded = useAsyncComputed(async () => {
  const files = props.state.result
  if (files == null) return false
  await Promise.all(files.map((file) => file.arrayBuffer()))
  return true
})
const imagesLoading = computed(() => !imagesLoaded.value)
</script>

<template>
  <div v-if="state.status !== 'initial'" ref="wrapperRef" class="image-selector">
    <ul class="list">
      <template v-if="state.status === 'running' || imagesLoading">
        <template v-for="idx in 4" :key="idx">
          <slot name="loading-item" :index="idx"></slot>
        </template>
      </template>
      <UIError v-else-if="state.status === 'failed'">{{ $t(state.error.userMessage) }}</UIError>
      <template v-else>
        <template v-for="(option, idx) in state.result ?? []" :key="idx">
          <slot name="item" :file="option" :active="selected === option" :select="handleSelect"></slot>
        </template>
      </template>
    </ul>

    <p class="tip">
      <slot name="tip"></slot>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.image-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.list {
  display: flex;
  align-items: center;
  align-content: center;
  gap: 8px;
  flex-wrap: nowrap;
  justify-content: center;
  list-style: none;
  padding: 0;
  margin: 0;
}

.tip {
  text-align: center;
  font-size: 12px;
  color: var(--ui-color-hint-2);
}
</style>
