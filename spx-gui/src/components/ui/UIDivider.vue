<template>
  <div>
    <NDivider style="margin: 0" :vertical="vertical" />
  </div>
</template>

<script lang="ts" setup>
import { NDivider } from 'naive-ui'

withDefaults(
  defineProps<{
    vertical?: boolean
  }>(),
  {
    vertical: false
  }
)
</script>
