<template>
  <NDivider class="ui-divider" :vertical="vertical" />
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

<style lang="scss" scoped>
.ui-divider {
  margin: 0;
}
</style>
