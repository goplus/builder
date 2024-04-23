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
import playCircle from './play-circle.svg?raw'
import loading from './loading.svg?raw'
import check from './check.svg?raw'
import microphone from './microphone.svg?raw'
import reload from './reload.svg?raw'
import stop from './stop.svg?raw'
import plus from './plus.svg?raw'
import trash from './trash.svg?raw'
import edit from './edit.svg?raw'
import eye from './eye.svg?raw'
import eyeSlash from './eye-slash.svg?raw'
import more from './more.svg?raw'
import exchange from './exchange.svg?raw'
import search from './search.svg?raw'
import close from './close.svg?raw'
import rotate from './rotate.svg?raw'
import share from './share.svg?raw'
import arrowAlt from './arrow-alt.svg?raw'

const typeIconMap = {
  file,
  arrowDown,
  arrowUp,
  play,
  playCircle,
  loading,
  check,
  microphone,
  reload,
  stop,
  plus,
  trash,
  edit,
  eye,
  eyeSlash,
  more,
  exchange,
  search,
  close,
  rotate,
  share,
  arrowAlt
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
