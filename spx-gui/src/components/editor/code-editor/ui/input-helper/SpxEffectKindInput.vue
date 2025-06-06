<script lang="ts">
export function getDefaultValue() {
  return effectKinds[0].name
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { effectKinds } from '@/utils/spx'
import { UISelect, UISelectOption } from '@/components/ui'

// TODO: Update UI for this component

const props = defineProps<{
  value: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

const modelValue = computed({
  get() {
    return props.value
  },
  set(name) {
    emit('update:value', name)
  }
})
</script>

<template>
  <UISelect v-model:value="modelValue" :style="{ alignSelf: 'stretch' }">
    <UISelectOption v-for="kind in effectKinds" :key="kind.name" :value="kind.name">
      {{ $t(kind.text) }}
    </UISelectOption>
  </UISelect>
</template>
