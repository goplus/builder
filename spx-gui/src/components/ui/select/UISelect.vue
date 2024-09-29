<template>
  <div class="ui-select">
    <span class="label">{{ selectedRef?.label ?? placeholder }}</span>
    <UIIcon class="arrow" type="arrowDown" />
    <select ref="selectRef" class="select" :value="value" @change="handleSelectChange">
      <slot></slot>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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

const selectedRef = ref<Selected>(null)
const selectRef = ref<HTMLSelectElement | null>(null)

async function syncSelected() {
  const select = await untilNotNull(() => selectRef.value)
  const selectedOption = select.selectedOptions[0]
  if (selectedOption == null) {
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
</script>

<style lang="scss" scoped>
.ui-select {
  height: var(--ui-line-height-2);
  padding: 0px var(--ui-gap-middle);
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;

  color: var(--ui-color-grey-1000);
  border-radius: 12px;
  background: var(--ui-color-grey-400);
}

.label {
  flex: 1 1 auto;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.arrow {
  flex: 0 0 auto;
}

.select {
  opacity: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}
</style>
