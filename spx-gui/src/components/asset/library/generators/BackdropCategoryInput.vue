<template>
  <UISelect :value="value" @update:value="handleUpdate">
    <UISelectOption v-for="option in backdropCategoryOptions" :key="option.value" :value="option.value">
      {{ $t(option.label) }}
    </UISelectOption>
  </UISelect>
</template>

<script setup lang="ts">
import { UISelect, UISelectOption } from '@/components/ui'
import { backdropCategoryOptions } from '@/components/project/types'

defineProps<{
  value: string | null
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

function handleUpdate(value: string | null) {
  if (value) {
    emit('update:value', value)
  }
}
</script>

<style lang="scss" scoped></style>
