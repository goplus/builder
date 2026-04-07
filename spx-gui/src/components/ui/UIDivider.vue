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
// When the root element is a naive-ui component, this cannot be placed in @layer components; otherwise, its styles will be overridden by naive-ui.
.ui-divider {
  margin: 0;
}
</style>
