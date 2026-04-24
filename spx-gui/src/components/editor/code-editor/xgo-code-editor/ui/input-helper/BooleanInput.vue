<script lang="ts">
export function getDefaultValue() {
  return true
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { UIRadioGroup, UIRadio } from '@/components/ui'

const props = defineProps<{
  value: boolean
}>()

const emit = defineEmits<{
  'update:value': [boolean]
  submit: []
}>()

const modelValue = computed({
  get() {
    return props.value + ''
  },
  set(vStr) {
    emit('update:value', vStr === 'true')
  }
})
</script>

<template>
  <UIRadioGroup v-model:value="modelValue" class="boolean-input">
    <UIRadio class="option" value="true">
      <code>true</code>
    </UIRadio>
    <UIRadio class="option" value="false">
      <code>false</code>
    </UIRadio>
  </UIRadioGroup>
</template>

<style scoped>
.boolean-input {
  padding: 5px 0;
  display: flex;
  align-items: center;
  align-self: stretch;
  gap: 12px;
}

.option {
  flex: 1 1 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  height: 32px;
  border-radius: 12px;
  transition: 0.2s;
  border: 1px solid var(--ui-color-grey-400);
}
.option.n-radio--checked {
  border: 1px solid var(--ui-color-primary-500);
}
</style>
