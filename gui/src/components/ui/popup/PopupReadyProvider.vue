<script setup lang="ts">
import { toRef } from 'vue'
import { providePopupReady } from '../utils'

const props = defineProps<{ ready: boolean }>()
providePopupReady(toRef(() => props.ready))
</script>

<template>
  <slot></slot>
</template>
