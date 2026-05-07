<template>
  <div
    class="ui-select"
    :data-ui-state="validationState"
    :data-disabled="props.disabled || undefined"
    :class="cn('relative rounded-md px-4 inline-flex items-center justify-between gap-0.5', props.class)"
  >
    <span
      class="min-w-0 flex-1 overflow-x-hidden text-ellipsis whitespace-nowrap"
      :class="selectedRef == null ? 'text-grey-700' : null"
    >
      {{ selectedRef?.label ?? placeholder }}
    </span>
    <UIIcon class="shrink-0" type="arrowDown" />
    <select
      ref="selectRef"
      v-bind="controlBindings"
      class="absolute inset-0 h-full w-full opacity-0"
      :value="value"
      :disabled="props.disabled"
      @change="handleSelectChange"
      @blur="handleBlur"
    >
      <option v-if="selectedRef == null" disabled :value="placeholderValue">{{ placeholder }}</option>
      <slot></slot>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { untilNotNull } from '@/utils/utils'
import { cn, type ClassValue } from '../utils'
import UIIcon from '../icons/UIIcon.vue'
import { useFieldControlBindings } from '../form/field-control-bindings'

const props = withDefaults(
  defineProps<{
    value: string | null
    placeholder?: string
    disabled?: boolean
    class?: ClassValue
  }>(),
  {
    placeholder: '',
    disabled: false,
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
const { controlBindings, onBlur, onChange, validationState } = useFieldControlBindings()

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
  const nextValue = selectRef.value!.selectedOptions[0]?.value ?? null
  emit('update:value', nextValue)
  if (nextValue === props.value) return
  onChange()
}

function handleBlur() {
  onBlur()
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

<style scoped>
@layer components {
  .ui-select {
    height: var(--ui-line-height-md);
    color: var(--ui-color-grey-1000);
    background: var(--ui-color-grey-300);
    transition: 0.3s;
  }

  .ui-select:hover {
    color: var(--ui-color-grey-800);
    background: var(--ui-color-grey-400);
  }

  .ui-select:has(:active) {
    color: var(--ui-color-grey-1000);
    background: var(--ui-color-grey-500);
  }

  .ui-select:has(:focus) {
    color: var(--ui-color-grey-1000);
    background: var(--ui-color-grey-400);
    box-shadow: inset 0 0 0 1px var(--ui-color-primary-500);
  }

  .ui-select[data-disabled='true'] {
    background: var(--ui-color-disabled-bg);
    color: var(--ui-color-disabled-text);
    box-shadow: none;
  }

  .ui-select[data-disabled='true'] select {
    cursor: not-allowed;
  }

  .ui-select[data-ui-state='success'] {
    box-shadow: inset 0 0 0 1px var(--ui-color-success-main);
  }

  .ui-select[data-ui-state='error'] {
    box-shadow: inset 0 0 0 1px var(--ui-color-danger-main);
  }

  .ui-select:is([data-ui-state='success'], [data-ui-state='error']):not(:hover) {
    background: var(--ui-color-grey-100);
  }
}
</style>
