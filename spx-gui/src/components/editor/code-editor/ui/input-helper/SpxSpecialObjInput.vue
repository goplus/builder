<script lang="ts">
export function getDefaultValue() {
  return specialObjs[0].value
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { specialObjs } from '@/utils/spx'
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
    return specialObjs.find((k) => k.value === props.value)?.name ?? null
  },
  set(name) {
    const kind = specialObjs.find((k) => k.name === name)
    if (kind == null) throw new Error(`Invalid play action: ${name}`)
    emit('update:value', kind.value)
  }
})
</script>

<template>
  <UISelect v-model:value="modelValue" :style="{ alignSelf: 'stretch' }">
    <UISelectOption v-for="kind in specialObjs" :key="kind.value" :value="kind.name">
      {{ $t(kind.text) }}
    </UISelectOption>
  </UISelect>
</template>
