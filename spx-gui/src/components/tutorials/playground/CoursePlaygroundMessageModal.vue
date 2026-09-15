<script setup lang="ts">
import { UIButton, UIModal, UIModalClose } from '@/components/ui'

defineProps<{
  visible: boolean
  content: string
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()
</script>

<template>
  <UIModal :visible="visible" size="small" @update:visible="emit('resolved')">
    <div class="px-5 pt-4 pb-6">
      <div class="flex justify-end">
        <UIModalClose @click="emit('resolved')" />
      </div>
      <p class="mt-2 whitespace-pre-wrap text-base">{{ content }}</p>
      <div class="mt-6 flex justify-end">
        <UIButton @click="emit('resolved')">{{ $t({ en: 'Continue', zh: '继续' }) }}</UIButton>
      </div>
    </div>
  </UIModal>
</template>
