<script lang="ts">
import { inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import GenStateFailed from './GenStateFailed.vue'

const imageSelectorCompactKey: InjectionKey<ComputedRef<boolean>> = Symbol('image-selector-compact')
const imageSelectorDisabledKey: InjectionKey<ComputedRef<boolean>> = Symbol('image-selector-disabled')

export function useImageSelectorCompact(): ComputedRef<boolean> {
  const compact = inject(imageSelectorCompactKey, null)
  if (compact == null) throw new Error('imageSelectorCompactKey should be provided')
  return compact
}

export function useImageSelectorDisabled(): ComputedRef<boolean> {
  const disabled = inject(imageSelectorDisabledKey, null)
  if (disabled == null) throw new Error('imageSelectorDisabledKey should be provided')
  return disabled
}
</script>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useContentSize } from '@/utils/dom'
import type { File } from '@/models/common/file'
import type { PhaseState } from '@/models/gen/common'

const props = withDefaults(
  defineProps<{
    state: PhaseState<File[]>
    selected: File | null
    disabled?: boolean
  }>(),
  {
    disabled: false
  }
)

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
provide(
  imageSelectorDisabledKey,
  computed(() => props.disabled)
)

function handleSelect(file: File) {
  if (props.disabled) return
  emit('select', file)
}
</script>

<template>
  <div
    v-if="state.status !== 'initial'"
    ref="wrapperRef"
    v-radar="{ name: 'Image selector', desc: 'Selector for choosing from generated images' }"
    class="image-selector"
  >
    <ul class="list">
      <template v-if="state.status === 'running'">
        <template v-for="idx in 4" :key="idx">
          <slot name="loading-item" :index="idx"></slot>
        </template>
      </template>
      <GenStateFailed v-else-if="state.status === 'failed'" :state-failed="state"></GenStateFailed>
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
