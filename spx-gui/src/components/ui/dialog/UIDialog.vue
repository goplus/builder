<template>
  <UIModal>
    <div class="flex gap-3 px-6 pt-5 pb-6">
      <UIIcon class="h-6 w-6" :type="type" />
      <div class="flex-[1_1_0] flex flex-col">
        <div class="mb-2 text-16 text-title">
          {{ title }}
        </div>
        <slot></slot>
      </div>
    </div>
  </UIModal>
</template>

<script setup lang="ts">
import UIIcon from '../icons/UIIcon.vue'
import UIModal from '../modal/UIModal.vue'

defineProps<{
  title: string
  type: 'info' | 'warning' | 'error' | 'success'
}>()
</script>
