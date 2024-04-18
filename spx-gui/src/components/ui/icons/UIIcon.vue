<template v-html="typeIconMap[type]">
  <!-- TODO: is there any way to avoid the wrapper `<div>`? -->
  <!-- eslint-disable-next-line vue/no-lone-template, vue/no-v-html -->
  <div class="ui-icon" v-html="typeIconMap[type]"></div>
</template>

<script setup lang="ts">
import file from './file.svg?raw'
import arrowDown from './arrow-down.svg?raw'
import arrowUp from './arrow-up.svg?raw'
import play from './play.svg?raw'
import loading from './loading.svg?raw'
import check from './check.svg?raw'
import microphone from './microphone.svg?raw'
import reload from './reload.svg?raw'
import stop from './stop.svg?raw'

const typeIconMap = {
  file,
  arrowDown,
  arrowUp,
  play,
  loading,
  check,
  microphone,
  reload,
  stop
}

export type Type = keyof typeof typeIconMap

defineProps<{
  type: Type
}>()
</script>

<style scoped lang="scss">
.ui-icon {
  width: 16px;
  height: 16px;
  display: flex;

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}
</style>
