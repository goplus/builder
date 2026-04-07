<template>
  <div class="ui-select">
    <span class="label" :class="{ placeholder: selectedRef == null }">{{ selectedRef?.label ?? placeholder }}</span>
    <UIIcon class="arrow" type="arrowDown" />
    <select ref="selectRef" class="select" :value="value" @change="handleSelectChange">
      <option v-if="selectedRef == null" disabled :value="placeholderValue">{{ placeholder }}</option>
      <slot></slot>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { untilNotNull } from '@/utils/utils'
import UIIcon from '../icons/UIIcon.vue'

const props = withDefaults(
  defineProps<{
    value: string | null
    placeholder?: string
  }>(),
  {
    placeholder: ''
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

<style lang="scss">
@layer components {
  .ui-select {
    height: var(--ui-line-height-2);
    padding: 0px var(--ui-gap-middle);
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 2px;

    border-radius: var(--ui-border-radius-2);
    color: var(--ui-color-grey-1000);
    background: var(--ui-color-grey-300);
    transition: 0.3s;

    &:hover {
      color: var(--ui-color-grey-800);
      background: var(--ui-color-grey-400);
    }
    &:has(:focus) {
      color: var(--ui-color-grey-1000);
      background: var(--ui-color-grey-400);
      box-shadow: inset 0 0 0 1px var(--ui-color-primary-500);
    }
    &:has(:active) {
      color: var(--ui-color-grey-1000);
      background: var(--ui-color-grey-500);
    }
  }
}
</style>

<style lang="scss" scoped>
.label {
  flex: 1 1 auto;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  &.placeholder {
    color: var(--ui-color-grey-700);
  }
}

.arrow {
  flex: 0 0 auto;
}

.select {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  opacity: 0;
}
</style>
