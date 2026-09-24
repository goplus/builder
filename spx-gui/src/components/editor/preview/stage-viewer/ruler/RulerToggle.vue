<script setup lang="ts">
import { UIButton } from '@/components/ui'

import rulerIconUrl from './triangle-ruler-button.svg?url&no-inline'

defineProps<{
  active?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <UIButton
    type="white"
    size="large"
    shape="square"
    :class="[
      'disabled:opacity-50',
      active === true && 'border-yellow-500 bg-yellow-100 enabled:hover:bg-yellow-100 enabled:active:bg-yellow-100'
    ]"
    :disabled="disabled"
    @click="emit('click')"
  >
    <template #icon>
      <img class="size-8 pointer-events-none object-contain" :src="rulerIconUrl" alt="" draggable="false" />
    </template>
  </UIButton>
</template>
