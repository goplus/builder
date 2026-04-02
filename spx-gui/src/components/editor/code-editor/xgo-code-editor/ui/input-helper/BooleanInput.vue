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
  <UIRadioGroup v-model:value="modelValue" class="flex self-stretch items-center gap-3 py-1.25">
    <UIRadio
      class="option flex h-8 flex-[1_1_0] items-center justify-center gap-0.5 rounded-2 border border-grey-400 transition-all"
      value="true"
    >
      <code>true</code>
    </UIRadio>
    <UIRadio
      class="option flex h-8 flex-[1_1_0] items-center justify-center gap-0.5 rounded-2 border border-grey-400 transition-all"
      value="false"
    >
      <code>false</code>
    </UIRadio>
  </UIRadioGroup>
</template>

<style scoped>
.option.n-radio--checked {
  border: 1px solid var(--ui-color-primary-500);
}
</style>
