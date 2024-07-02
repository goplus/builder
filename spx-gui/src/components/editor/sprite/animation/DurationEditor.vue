<template>
  <UIDropdownModal
    :title="$t({ en: 'Adjust duration', zh: '调整时长' })"
    style="width: 280px"
    @cancel="emit('close')"
    @confirm="handleConfirm"
  >
    <UINumberInput v-model:value="duration" :min="0.01">
      <template #prefix>{{ $t({ en: 'Duration', zh: '时长' }) }}:</template>
      <template #suffix>{{ $t({ en: 's', zh: '秒' }) }}</template>
    </UINumberInput>
  </UIDropdownModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Animation } from '@/models/animation'
import { UIDropdownModal, UINumberInput } from '@/components/ui'

const props = defineProps<{
  animation: Animation
}>()

const emit = defineEmits<{
  close: []
}>()

const duration = ref(props.animation.duration)

function handleConfirm() {
  props.animation.setDuration(duration.value)
  emit('close')
}
</script>
