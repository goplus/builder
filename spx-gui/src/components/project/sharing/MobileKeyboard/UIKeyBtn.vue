<script setup lang="ts">
import type { KeyboardEventType, KeyCode } from '@/components/project/sharing/MobileKeyboard/mobile-keyboard'

import { webKeyMap } from '@/utils/spx'
defineOptions({ name: 'UIKeyBtn' })

const props = withDefaults(
  defineProps<{
    value: string
    active?: boolean
    size?: number
  }>(),
  {
    active: false,
    size: 50
  }
)
const emit = defineEmits<{
  key: [type: KeyboardEventType, key: KeyCode]
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
function getKeyDisplayText(keyValue: string): string {
  const textEn = webKeyMap.get(keyValue) ?? keyValue
  return keyDisplayMap[textEn] ?? textEn
}

let isPressed = false
function press(down: boolean) {
  function dispatchKey(type: KeyboardEventType, v: string) {
    emit('key', type, v)
  }
  if (down && !isPressed) {
    isPressed = true
    dispatchKey('keydown', props.value)
  } else if (!down && isPressed) {
    isPressed = false
    dispatchKey('keyup', props.value)
  }
}
</script>

<template>
  <div v-if="!props.active" class="ui-key-btn" :style="{ width: props.size + 'px', height: props.size + 'px' }">{{
    getKeyDisplayText(props.value) }}</div>
  <div v-else class="ui-key-btn" :style="{ width: props.size + 'px', height: props.size + 'px' }"
    @pointerdown.prevent.stop="press(true)" @pointerup.prevent.stop="press(false)"
    @pointercancel.prevent.stop="press(false)" @pointerleave.prevent.stop="press(false)">
    {{ getKeyDisplayText(props.value) }}
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
