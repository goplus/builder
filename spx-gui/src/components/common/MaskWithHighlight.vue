<script setup lang="ts">
import { ref, watch, onMounted, computed, onBeforeUnmount } from 'vue'
import { useTag } from '@/utils/tagging'

const props = defineProps<{
  visible: boolean
  highlightElementPath: string
}>()
const { getElement } = useTag()

const borderRadius = ref(10)

type HighlightRect = {
  left: number
  top: number
  width: number
  height: number
}

const highlightRect = ref<HighlightRect>({
  left: 0,
  top: 0,
  width: 0,
  height: 0
})

const zIndex = ref(9999)

const screenWidth = ref(window.innerWidth)
const screenHeight = ref(window.innerHeight)

const updateHighlightRect = () => {
  const element = getElement(props.highlightElementPath)
  if (element) {
    const rect = element.getBoundingClientRect()
    highlightRect.value = {
      left: rect.left + window.scrollX - 10,
      top: rect.top + window.scrollY - 10,
      width: rect.width + 20,
      height: rect.height + 20
    }
  }
}

/**
 * 生成带圆角矩形的 Path（SVG 路径）
 */
function createRoundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  return `
    M${x + rr},${y}
    H${x + w - rr}
    Q${x + w},${y} ${x + w},${y + rr}
    V${y + h - rr}
    Q${x + w},${y + h} ${x + w - rr},${y + h}
    H${x + rr}
    Q${x},${y + h} ${x},${y + h - rr}
    V${y + rr}
    Q${x},${y} ${x + rr},${y}
    Z
  `
}

/**
 * 生成“全屏矩形 + 挖空洞”的组合路径
 * 利用 fill-rule: evenodd 来把洞挖掉
 */
const svgPath = computed(() => {
  const x = highlightRect.value.left
  const y = highlightRect.value.top
  const w = highlightRect.value.width
  const h = highlightRect.value.height
  const r = borderRadius.value

  const outerRect = `M0,0 H${screenWidth.value} V${screenHeight.value} H0 Z`

  const holeRect = createRoundedRectPath(x, y, w, h, r)

  return outerRect + ' ' + holeRect
})

watch(
  () => props.highlightElementPath,
  () => {
    if (props.visible) updateHighlightRect()
  }
)

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) updateHighlightRect()
  }
)

onMounted(() => {
  if (props.visible) updateHighlightRect()
  window.addEventListener('resize', () => {
    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', () => {
    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight
  })
})
</script>

<template>
  <Transition>
    <div v-if="visible" class="mask">
      <svg
        class="svg-mask"
        :width="screenWidth"
        :height="screenHeight"
        :viewBox="`0 0 ${screenWidth} ${screenHeight}`"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        :style="{
          zIndex: zIndex
        }"
      >
        <path :d="svgPath" fill="rgba(0, 0, 0, 0.5)" fill-rule="evenodd" pointer-events="fill" />
      </svg>
      <slot :highlight-rect="highlightRect" :z-index="zIndex" />
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.svg-mask {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  width: 100vw;
  height: 100vh;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
