<template v-html="typeIconMap[type]">
  <!-- TODO: is there any way to avoid the wrapper `<div>`? -->
  <!-- eslint-disable-next-line vue/no-lone-template, vue/no-v-html -->
  <div class="ui-icon" v-html="typeIconMap[type]"></div>
</template>

<script setup lang="ts">
import file from './file.svg?raw'
import arrowDown from './arrow-down.svg?raw'
import arrowUp from './arrow-up.svg?raw'

const typeIconMap = {
  file,
  arrowDown,
  arrowUp
}

type Type = keyof typeof typeIconMap

defineProps<{
  type: Type
}>()
</script>

<style scoped lang="scss">
.ui-icon {
  width: 16px;
  height: 16px;

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}
</style>