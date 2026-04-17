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
import type { PhaseState } from '@/models/spx/gen/common'

const props = withDefaults(
  defineProps<{
    state: PhaseState<File[]>
    selected: number | null
    disabled?: boolean
  }>(),
  {
    disabled: false
  }
)

const emit = defineEmits<{
  select: [number]
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

function handleSelect(index: number) {
  if (props.disabled) return
  emit('select', index)
}
</script>

<template>
  <div
    v-if="state.status !== 'initial'"
    ref="wrapperRef"
    v-radar="{ name: 'Image selector', desc: 'Selector for choosing from generated images' }"
    class="flex flex-col items-center gap-3"
  >
    <ul class="m-0 list-none flex flex-nowrap items-center content-center justify-center gap-2 p-0">
      <template v-if="state.status === 'running'">
        <template v-for="idx in 4" :key="idx">
          <slot name="loading-item" :index="idx"></slot>
        </template>
      </template>
      <GenStateFailed v-else-if="state.status === 'failed'" :state-failed="state"></GenStateFailed>
      <template v-else>
        <template v-for="(option, idx) in state.result ?? []" :key="idx">
          <slot name="item" :file="option" :active="selected === idx" :on-click="() => handleSelect(idx)"></slot>
        </template>
      </template>
    </ul>

    <p class="text-center text-xs text-hint-2">
      <slot name="tip"></slot>
    </p>
  </div>
</template>
