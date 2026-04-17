<template>
  <div class="ui-select" :class="rootClass">
    <span
      class="min-w-0 flex-1 overflow-x-hidden text-ellipsis whitespace-nowrap"
      :class="selectedRef == null ? 'text-grey-700' : null"
    >
      {{ selectedRef?.label ?? placeholder }}
    </span>
    <UIIcon class="shrink-0" type="arrowDown" />
    <select
      ref="selectRef"
      class="absolute inset-0 h-full w-full opacity-0"
      :value="value"
      @change="handleSelectChange"
    >
      <option v-if="selectedRef == null" disabled :value="placeholderValue">{{ placeholder }}</option>
      <slot></slot>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { untilNotNull } from '@/utils/utils'
import { cn, type ClassValue } from '../utils'
import UIIcon from '../icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    value: string | null
    placeholder?: string
    class?: ClassValue
  }>(),
  {
    placeholder: '',
    class: undefined
  }
)

const emit = defineEmits<{
  'update:value': [string | null]
}>()

type Selected = {
  value: string
  label: string
} | null

// Internal sentinel for the disabled placeholder option.
// Uses a NUL character so it cannot collide with any real option value.
const placeholderValue = '\0'

const selectedRef = ref<Selected>(null)
const selectRef = ref<HTMLSelectElement | null>(null)
const rootClass = computed(() =>
  cn(
    'relative h-(--ui-line-height-md) inline-flex items-center justify-between gap-0.5 rounded-md px-4 text-grey-1000 bg-grey-300 [transition:0.3s]',
    props.class ?? null
  )
)

async function syncSelected() {
  const select = await untilNotNull(() => selectRef.value)
  const selectedOption = select.selectedOptions[0]
  if (selectedOption == null || selectedOption.disabled) {
    selectedRef.value = null
    return
  }
  selectedRef.value = {
    value: selectedOption.value,
    label: selectedOption.textContent ?? ''
  }
}

function handleSelectChange() {
  emit('update:value', selectRef.value!.selectedOptions[0]?.value ?? null)
}

watch(() => props.value, syncSelected, {
  flush: 'post', // wait for HTML select to react to value change
  immediate: true
})

// Re-sync when child options change (e.g., async-loaded options)
let observer: MutationObserver | null = null

onMounted(() => {
  if (selectRef.value == null) return
  observer = new MutationObserver(() => syncSelected())
  observer.observe(selectRef.value, { childList: true })
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<style>
@layer components {
  .ui-select:hover {
    color: var(--ui-color-grey-800);
    background: var(--ui-color-grey-400);
  }

  .ui-select:has(:focus) {
    color: var(--ui-color-grey-1000);
    background: var(--ui-color-grey-400);
    box-shadow: inset 0 0 0 1px var(--ui-color-primary-500);
  }

  .ui-select:has(:active) {
    color: var(--ui-color-grey-1000);
    background: var(--ui-color-grey-500);
  }
}
</style>
