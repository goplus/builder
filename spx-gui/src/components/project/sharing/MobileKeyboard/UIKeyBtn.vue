<script setup lang="ts">
import { KeyboardEventType, KeyCode } from '@/components/project/sharing/MobileKeyboard/mobile-keyboard'
defineOptions({ name: 'UIKeyBtn' })
const props = withDefaults(
  defineProps<{
    value: string
    active?: boolean
  }>(),
  {
    active: false
  }
)
const emit = defineEmits<{
  key: [type: KeyboardEventType, key: KeyCode]
}>()
let isPressed = false
function press(down: boolean) {
  function toKeyAndCode(v: string): KeyCode {
    // preprocessing - convert string to KeyCode enum
    const special: Record<string, KeyCode> = {
      '<': KeyCode.ARROW_LEFT,
      v: KeyCode.ARROW_DOWN,
      '^': KeyCode.ARROW_UP,
      '>': KeyCode.ARROW_RIGHT
    }
    if (special[v] != null) return special[v]

    if (/^[A-Za-z]$/.test(v)) {
      const u = v.toUpperCase()
      return u as KeyCode
    }
    return v as KeyCode
  }
  function dispatchKey(type: KeyboardEventType, v: string) {
    const keyCode = toKeyAndCode(v)
    emit('key', type, keyCode)
  }
  if (down && !isPressed) {
    isPressed = true
    dispatchKey(KeyboardEventType.KEY_DOWN, props.value)
  } else if (!down && isPressed) {
    isPressed = false
    dispatchKey(KeyboardEventType.KEY_UP, props.value)
  }
}
</script>

<template>
  <div v-if="!props.active" class="ui-key-btn">{{ props.value }}</div>
  <div
    v-else
    class="ui-key-btn"
    @pointerdown.prevent.stop="press(true)"
    @pointerup.prevent.stop="press(false)"
    @pointercancel.prevent.stop="press(false)"
    @pointerleave.prevent.stop="press(false)"
  >
    {{ props.value }}
  </div>
</template>

<style lang="scss" scoped>
.ui-key-btn {
  width: 50px;
  height: 50px;
  background-color: #b6b4b4;
  user-select: none;
  border-radius: 100px;
  text-align: center;
  line-height: 50px;
  color: #fff;
  opacity: 0.6;
}
</style>
