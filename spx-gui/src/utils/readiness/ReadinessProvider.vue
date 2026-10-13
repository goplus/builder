<script setup lang="ts">
import { useProvideReadiness, type ReadinessScope } from './index'

const props = defineProps<{ scope: ReadinessScope }>()
useProvideReadiness(props.scope)
</script>

<template>
  <slot />
</template>
