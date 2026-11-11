<script setup lang="ts">
import { toRef } from 'vue'
import { providePopupVisible } from '../utils'

const props = defineProps<{ visible: boolean }>()
providePopupVisible(toRef(() => props.visible))
</script>

<template>
  <slot></slot>
</template>
