<script setup lang="ts">
import type { KeyboardEventType, WebKeyValue } from '@/components/project/sharing/MobileKeyboard/mobile-keyboard'

import { webKeyToTextMap } from '@/utils/spx'
import { onUnmounted } from 'vue'
defineOptions({ name: 'UIKeyBtn' })

const props = withDefaults(
  defineProps<{
    webKeyValue: string
    active?: boolean
    size?: number
  }>(),
  {
    active: false,
    size: 50
  }
)
const emit = defineEmits<{
  key: [type: KeyboardEventType, key: WebKeyValue]
}>()

// 按键显示映射 - 将长按键名映射为短字符显示
const keyDisplayMap: Record<string, string> = {
  // 箭头键
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',

  Enter: '↵',
  Backspace: '⌫',
  Tab: 'Tab',
  Shift: '⇧',
  Control: 'Ctrl',
  Alt: 'Alt',
  Escape: 'Esc'
}

// 获取按键的显示文本
function getKeyDisplayText(webKeyValue: string): string {
  const textEn = webKeyToTextMap.get(webKeyValue) ?? webKeyValue
  return keyDisplayMap[textEn] ?? textEn
}

let isPressed = false
let repeatTimer: number | null = null
let delayTimer: number | null = null
const INITIAL_DELAY_MS = 300
const REPEAT_INTERVAL_MS = 50

function clearTimers() {
  if (delayTimer !== null) {
    clearTimeout(delayTimer)
    delayTimer = null
  }
  if (repeatTimer !== null) {
    clearInterval(repeatTimer)
    repeatTimer = null
  }
}

function press(down: boolean) {
  function dispatchKey(type: KeyboardEventType, v: string) {
    emit('key', type, v)
  }
  if (down && !isPressed) {
    isPressed = true
    dispatchKey('keydown', props.webKeyValue)
    delayTimer = window.setTimeout(() => {
      repeatTimer = window.setInterval(() => {
        if (isPressed) dispatchKey('keydown', props.webKeyValue)
      }, REPEAT_INTERVAL_MS)
    }, INITIAL_DELAY_MS)
  } else if (!down && isPressed) {
    isPressed = false
    clearTimers()
    dispatchKey('keyup', props.webKeyValue)
  }
}

onUnmounted(() => {
  isPressed = false
  clearTimers()
})
</script>

<template>
  <div v-if="!props.active" class="ui-key-btn" :style="{ width: props.size + 'px', height: props.size + 'px' }">
    {{ getKeyDisplayText(props.webKeyValue) }}
  </div>
  <div
    v-else
    class="ui-key-btn"
    :style="{ width: props.size + 'px', height: props.size + 'px' }"
    @pointerdown.prevent.stop="press(true)"
    @pointerup.prevent.stop="press(false)"
    @pointercancel.prevent.stop="press(false)"
    @pointerleave.prevent.stop="press(false)"
  >
    {{ getKeyDisplayText(props.webKeyValue) }}
  </div>
</template>

<style lang="scss" scoped>
.ui-key-btn {
  background-color: #b6b4b4;
  user-select: none;
  border-radius: 100px;
  text-align: center;
  line-height: 50px;
  color: #fff;
  opacity: 0.6;
}
</style>
