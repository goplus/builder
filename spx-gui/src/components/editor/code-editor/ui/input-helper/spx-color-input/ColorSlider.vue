<script setup lang="ts">
import { ref, computed } from 'vue'
import { useContentSize } from '@/utils/dom'

const props = defineProps<{
  /** Value from 0 to 100 */
  value: number
  /** Function to get color string from value */
  getColor: (value: number) => string
}>()

const emit = defineEmits<{
  'update:value': [number]
}>()

// Color stops to generate the gradient
const colorStopNum = 19
const colorStops = computed(() =>
  Array.from({ length: colorStopNum }, (_, i) => (i / (colorStopNum - 1)) * 100).map((v) => ({
    percent: v.toFixed(2) + '%',
    color: props.getColor(v)
  }))
)

const barStartBg = computed(() => colorStops.value[0].color)
const barEndBg = computed(() => colorStops.value[colorStops.value.length - 1].color)
const barBg = computed(
  () => `linear-gradient(90deg, ${colorStops.value.map((p) => `${p.color} ${p.percent}`).join(', ')})`
)

type Dragging = {
  rect: DOMRect
  initialClientX: number
  value: number
}

const dragging = ref<Dragging | null>(null)
const barRef = ref<HTMLDivElement | null>(null)
const barSize = useContentSize(barRef)
const valueRef = computed(() => dragging.value?.value ?? props.value)
const handlerLeft = computed(() => {
  if (barSize.value == null) return 0
  return (valueRef.value / 100) * barSize.value.width
})

function normalizeValue(value: number) {
  return Math.round(Math.max(0, Math.min(100, value)))
}

function handleSliderMousedown(e: MouseEvent) {
  const bar = barRef.value
  if (bar == null) return
  dragging.value = {
    rect: bar.getBoundingClientRect(),
    initialClientX: e.clientX,
    value: props.value
  }
  window.addEventListener('mousemove', handleDrag)
  window.addEventListener('mouseup', handleDragEnd)
  document.body.style.userSelect = 'none'
}

function handleDrag(e: MouseEvent) {
  if (dragging.value == null) return
  const { rect, initialClientX: initialX } = dragging.value
  dragging.value.value = normalizeValue(props.value + ((e.clientX - initialX) / rect.width) * 100)
}

function handleDragEnd() {
  if (dragging.value == null) return
  window.removeEventListener('mousemove', handleDrag)
  window.removeEventListener('mouseup', handleDragEnd)
  emit('update:value', dragging.value.value)
  dragging.value = null
  document.body.style.userSelect = ''
}

function handleBarClick(e: MouseEvent) {
  const bar = barRef.value
  if (bar == null) return
  const rect = bar.getBoundingClientRect()
  emit('update:value', normalizeValue(((e.clientX - rect.left) / rect.width) * 100))
}
</script>

<template>
  <div class="color-slider">
    <div class="bar" :style="{ borderLeftColor: barStartBg, borderRightColor: barEndBg }" @click="handleBarClick">
      <div ref="barRef" class="inner-bar" :style="{ background: barBg }"></div>
    </div>
    <div
      class="handler"
      :style="{
        backgroundColor: props.getColor(valueRef),
        left: `${handlerLeft}px`,
        cursor: dragging == null ? 'grab' : 'grabbing'
      }"
      @mousedown="handleSliderMousedown"
    ></div>
  </div>
</template>

<style lang="scss" scoped>
.color-slider {
  position: relative;
  width: 100%;
  padding: 5px 0;
  border-radius: 10px;
  cursor: pointer;
}
.bar {
  width: 100%;
  height: 20px;
  border-radius: 10px;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
}
.inner-bar {
  width: 100%;
  height: 100%;
}
.handler {
  position: absolute;
  top: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 5px solid #fff;
  box-shadow: 0px 12px 20px rgba(14, 18, 27, 0.12);
  transition: background-color 0.3s ease;
}
</style>
