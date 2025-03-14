<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue'
import { useTag } from '../../utils/tagging'
import { useElementRect } from '../../utils/dom'

export type HighlightRect = {
  left: number
  top: number
  width: number
  height: number
}

const props = defineProps<{
  visible: boolean
  highlightElementPath: string
}>()

const { getElement } = useTag()
const targetElement = ref<HTMLElement | null>(null)

// 不再使用computed，而是在onMounted后设置目标元素
// 避免在TagConsumer挂载前调用getElement
onMounted(() => {
  // 延迟执行，确保TagConsumer已挂载
  setTimeout(() => {
    updateTargetElement()
  }, 0)
})

// 更新目标元素的函数
function updateTargetElement() {
  // 清晰的开始标记
  console.warn('===== 开始检查目标元素 =====')
  console.warn(`检查路径: "${props.highlightElementPath}"`)
  console.warn(`路径类型: ${typeof props.highlightElementPath}`)
  console.warn(`路径值: ${JSON.stringify(props.highlightElementPath)}`)

  if (!props.visible) {
    console.warn('遮罩不可见，不检查目标元素')
    targetElement.value = null
    return
  }

  if (!props.highlightElementPath) {
    console.warn('目标元素路径为空')
    targetElement.value = null
    return
  }

  try {
    // 确保路径是字符串
    const elementPath = String(props.highlightElementPath)
    console.warn(`转换后的路径类型: ${typeof elementPath}`)
    console.warn(`转换后的路径值: "${elementPath}"`)

    // 检查路径格式是否有效
    const isValidPath = /^[a-zA-Z0-9_\-\/\.]+$/.test(elementPath)
    if (!isValidPath) {
      console.warn(`目标元素路径格式可能无效: "${elementPath}"`)
    }

    // 使用转换后的字符串调用 getElement
    targetElement.value = getElement(elementPath)

    if (targetElement.value) {
      console.warn(
        `✅ 成功找到目标元素:`,
        targetElement.value.tagName,
        `ID: ${targetElement.value.id || '无'}, ` + `类名: ${targetElement.value.className || '无'}`
      )
    } else {
      console.warn(`❌ 未找到目标元素: "${elementPath}"`)
    }
  } catch (error) {
    console.warn(`⚠️ 获取目标元素时发生错误:`, error)
    targetElement.value = null
  }

  console.warn('===== 目标元素检查结束 =====')
}

// 监听highlightElementPath变化
watch(() => props.highlightElementPath, updateTargetElement)
watch(() => props.visible, updateTargetElement)

const elementRect = useElementRect(targetElement)

const screenWidth = ref(window.innerWidth)
const screenHeight = ref(window.innerHeight)

const borderRadius = 10

const highlightRect = computed<HighlightRect>(() => {
  const rect = elementRect.value
  if (rect) {
    return {
      left: rect.left + window.scrollX - 10,
      top: rect.top + window.scrollY - 10,
      width: rect.width + 20,
      height: rect.height + 20
    }
  }
  // 使用默认位置
  return {
    left: screenWidth.value / 2 - 100,
    top: screenHeight.value / 2 - 100,
    width: 200,
    height: 200
  }
})

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

const svgPath = computed(() => {
  const { left, top, width, height } = highlightRect.value
  const outerRect = `M0,0 H${screenWidth.value} V${screenHeight.value} H0 Z`
  const holeRect = createRoundedRectPath(left, top, width, height, borderRadius)
  return outerRect + ' ' + holeRect
})

function updateScreenSize() {
  screenWidth.value = window.innerWidth
  screenHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', updateScreenSize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScreenSize)
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
      >
        <path :d="svgPath" fill="rgba(0, 0, 0, 0.5)" fill-rule="evenodd" pointer-events="fill" />
      </svg>
      <div class="slot-container">
        <slot :slot-info="highlightRect" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.svg-mask {
  pointer-events: none;
  width: 100vw;
  height: 100vh;
}

.slot-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  pointer-events: none;
}
.slot-container * {
  pointer-events: auto;
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
