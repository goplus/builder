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
  <UIRadioGroup v-model:value="modelValue" class="py-[5px] self-stretch gap-3">
    <UIRadio
      class="flex-auto h-8 rounded-md border justify-center gap-0.5"
      :class="modelValue === 'true' ? 'border-primary-500' : 'border-grey-400'"
      value="true"
    >
      <code>true</code>
    </UIRadio>
    <UIRadio
      class="flex-auto h-8 rounded-md border justify-center gap-0.5"
      :class="modelValue === 'false' ? 'border-primary-500' : 'border-grey-400'"
      value="false"
    >
      <code>false</code>
    </UIRadio>
  </UIRadioGroup>
</template>
