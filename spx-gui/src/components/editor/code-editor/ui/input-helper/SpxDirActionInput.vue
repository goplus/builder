<script lang="ts">
export function getDefaultValue() {
  return dirActions[0].name
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { dirActions } from '@/utils/spx'
import { UISelect, UISelectOption } from '@/components/ui'

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
  <!-- TODO: Update UI for this component -->
  <UISelect v-model:value="modelValue" :style="{ alignSelf: 'stretch' }">
    <UISelectOption v-for="kind in dirActions" :key="kind.name" :value="kind.name">
      {{ $t(kind.text) }}
    </UISelectOption>
  </UISelect>
</template>
