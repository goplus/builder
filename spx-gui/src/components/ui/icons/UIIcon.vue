<template v-html="typeIconMap[type]">
  <!-- TODO: is there any way to avoid the wrapper `<div>`? -->
  <!-- eslint-disable-next-line vue/no-lone-template, vue/no-v-html -->
  <div class="ui-icon" :class="{ spinning: type === 'loading' }" v-html="typeIconMap[type]"></div>
</template>

<script setup lang="ts">
import file from './file.svg?raw'
import arrowDown from './arrow-down.svg?raw'
import arrowUp from './arrow-up.svg?raw'
import play from './play.svg?raw'
import playHollow from './play-hollow.svg?raw'
import playCircle from './play-circle.svg?raw'
import loading from './loading.svg?raw'
import check from './check.svg?raw'
import microphone from './microphone.svg?raw'
import reload from './reload.svg?raw'
import stop from './stop.svg?raw'
import plus from './plus.svg?raw'
import trash from './trash.svg?raw'
import edit from './edit.svg?raw'
import edit2 from './edit-2.svg?raw'
import eye from './eye.svg?raw'
import eyeSlash from './eye-slash.svg?raw'
import more from './more.svg?raw'
import exchange from './exchange.svg?raw'
import search from './search.svg?raw'
import close from './close.svg?raw'
import closeCircle from './close-circle.svg?raw'
import rotate from './rotate.svg?raw'
import share from './share.svg?raw'
import arrowAlt from './arrow-alt.svg?raw'
import doubleArrowDown from './double-arrow-down.svg?raw'
import clock from './clock.svg?raw'
import timer from './timer.svg?raw'
import status from './status.svg?raw'
import sound from './sound.svg?raw'
import volumeUp from './volume-up.svg?raw'
import volumeOff from './volume-off.svg?raw'
import statePublic from './state-public.svg?raw'
import statePrivate from './state-private.svg?raw'
import heart from './heart.svg?raw'
import arrowRightSmall from './arrow-right-small.svg?raw'
import calendar from './calendar.svg?raw'
import remix from './remix.svg?raw'
import heartHollow from './heart-hollow.svg?raw'
import info from './info.svg?raw'
import warning from './warning.svg?raw'
import error from './error.svg?raw'
import errorTriangle from './error-triangle.svg?raw'
import success from './success.svg?raw'
import apply from './apply.svg?raw'
import insert from './insert.svg?raw'
import copy from './copy.svg?raw'
import fullScreen from './full-screen.svg?raw'
import enterFullScreen from './enter-full-screen.svg?raw'
import exitFullScreen from './exit-full-screen.svg?raw'
import end from './end.svg?raw'
import eyedrop from './eyedrop.svg?raw'
import tutorial from './tutorial.svg?raw'
import question from './question.svg?raw'
import setting from './setting.svg?raw'
import undo from './undo.svg?raw'
import redo from './redo.svg?raw'

const typeIconMap = {
  file,
  arrowDown,
  arrowUp,
  play,
  playHollow,
  playCircle,
  loading,
  check,
  microphone,
  reload,
  stop,
  plus,
  trash,
  edit,
  edit2, // TODO: can we merge edit & edit2?
  eye,
  eyeSlash,
  more,
  exchange,
  search,
  close,
  closeCircle,
  rotate,
  share,
  arrowAlt,
  doubleArrowDown,
  clock,
  timer,
  status,
  sound,
  volumeUp,
  volumeOff,
  statePublic,
  statePrivate,
  heart,
  arrowRightSmall,
  calendar,
  remix,
  heartHollow,
  info,
  warning,
  error,
  errorTriangle,
  success,
  apply,
  insert,
  copy,
  fullScreen,
  enterFullScreen,
  exitFullScreen,
  end,
  eyedrop,
  tutorial,
  question,
  setting,
  undo,
  redo
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

.spinning {
  animation: ui-icon-spinning 1s linear infinite;
  @keyframes ui-icon-spinning {
    from {
      transform-origin: 50% 50%;
      transform: rotate(0);
    }
    to {
      transform-origin: 50% 50%;
      transform: rotate(360deg);
    }
  }
}
</style>
