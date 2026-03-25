<template>
  <div ref="container" class="record-control-container">
    <div class="shaded-area left-fixed"></div>
    <div class="shaded-area left" :style="{ width: `${props.value.left * 100}%` }"></div>
    <div
      class="selection-area"
      :style="{ left: `${props.value.left * 100}%`, right: `${(1 - props.value.right) * 100}%` }"
    >
      <div class="control-bar left-bar" @mousedown="startDrag('left')"></div>
      <div class="control-bar right-bar" @mousedown="startDrag('right')"></div>
    </div>
    <div class="shaded-area right" :style="{ width: `${(1 - props.value.right) * 100}%` }"></div>
    <div class="shaded-area right-fixed"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ value: { left: number; right: number } }>()
const emit = defineEmits<{
  'update:value': [value: { left: number; right: number }]
  stopDrag: [side: 'left' | 'right']
}>()

const isDragging = ref(false)
const dragSide = ref<'left' | 'right' | null>(null)
const container = ref<HTMLDivElement | null>(null)

const startDrag = (side: 'left' | 'right') => {
  dragSide.value = side
  isDragging.value = true
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', stopDrag)
}

const stopDrag = () => {
  if (dragSide.value == null) return
  emit('stopDrag', dragSide.value)
  isDragging.value = false
  dragSide.value = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', stopDrag)
}

const onMouseMove = (event: MouseEvent) => {
  if (!isDragging.value || !container.value) return

  const rect = container.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mousePercent = Math.max(Math.min((mouseX / rect.width) * 100, 100), 0)

  let newLeft = props.value.left
  let newRight = props.value.right

  if (dragSide.value === 'left') {
    newLeft = Math.min(mousePercent / 100, props.value.right)
  } else if (dragSide.value === 'right') {
    newRight = Math.max(mousePercent / 100, props.value.left)
  }

  emit('update:value', {
    left: newLeft,
    right: newRight
  })
}
</script>

<style scoped lang="scss">
.record-control-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  user-select: none;
  margin: 0 16px;
}

.shaded-area {
  opacity: 0.2;
  background-color: var(--ui-color-yellow-400);
  height: 100%;
  position: absolute;

  &.left {
    left: 0;
  }
  &.right {
    right: 0;
  }
  &.left-fixed {
    width: 16px;
    left: -16px;
  }
  &.right-fixed {
    width: 16px;
    right: -16px;
  }
}

.selection-area {
  position: absolute;
  height: 100%;
  display: flex;
  align-items: center;
}

.control-bar {
  width: 16px;
  height: 100%;
  background-color: var(--ui-color-yellow-400);
  position: absolute;
  z-index: 10;
  cursor: ew-resize;
}

.control-bar::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 40px;
  background-color: #ffffff;
  transform: translate(-50%, -50%);
  border-radius: 1px;
}

.left-bar {
  left: -16px;
}

.right-bar {
  right: -16px;
}
</style>
