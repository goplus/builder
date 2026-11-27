<script setup lang="ts">
import { ref } from 'vue'
import { providePopupContainer } from '@/components/ui/utils'

const cardRef = ref<HTMLElement>()
// Keep nested popups inside the card's hover region.
providePopupContainer(cardRef)
</script>

<template>
  <div ref="cardRef" class="rounded-sm bg-grey-100 shadow-sm">
    <slot></slot>
  </div>
</template>
