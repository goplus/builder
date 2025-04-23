<script lang="ts">
export function getDefaultValue() {
  return effectKinds[0].value
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { effectKinds } from '@/utils/spx'
import { UISelect, UISelectOption } from '@/components/ui'

// TODO: Update UI for this component

const props = defineProps<{
  value: number
}>()

const emit = defineEmits<{
  'update:value': [number]
}>()

const modelValue = computed({
  get() {
    return effectKinds.find((k) => k.value === props.value)?.name ?? null
  },
  set(name) {
    const kind = effectKinds.find((k) => k.name === name)
    if (kind == null) throw new Error(`Invalid effect kind: ${name}`)
    emit('update:value', kind.value)
  }
})
</script>

<template>
  <UISelect v-model:value="modelValue">
    <UISelectOption v-for="kind in effectKinds" :key="kind.value" :value="kind.name">
      {{ kind.name }}
    </UISelectOption>
  </UISelect>
</template>
