<template>
  <div class="guide-ui-container">
    <img
      class="niuxiaoqi"
      :style="getNiuxiaoqiStyle(slotInfo)"
      width="300"
      height="320"
      src="https://www-static.qbox.me/sem/pili-live-1001/source/img/qiniu.png"
    />
    <svg
      class="ic-bubble"
      :style="getBubbleStyle(slotInfo)"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="1444"
      width="300"
      height="200"
    >
      <path
        d="M149.333333 896a21.333333 21.333333 0 0 1-15.086666-36.42L823.166667 170.666667H661.333333a21.333333 21.333333 0 0 1 0-42.666667h213.46a21.333333 21.333333 0 0 1 21.206667 21.206667V362.666667a21.333333 21.333333 0 0 1-42.666667 0V200.833333L164.42 889.753333A21.266667 21.266667 0 0 1 149.333333 896z"
        fill="#5C5C66"
        class="icon-fill"
        p-id="1445"
      ></path>
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial"
        font-size="48"
        fill="black"
      >
        {{ props.step.description.zh }}
      </text>
    </svg>
    <svg
      t="1741314616196"
      class="ic-arrow"
      :style="getArrowStyle(slotInfo)"
      viewBox="0 0 1536 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="6877"
      width="200"
      height="200"
    >
      <path
        d="M269.824 1024H0l122.481778-133.461333V56.888889a56.888889 56.888889 0 0 1 56.888889-56.888889H1479.111111a56.888889 56.888889 0 0 1 56.888889 56.888889v910.222222a56.888889 56.888889 0 0 1-56.888889 56.888889z"
        class="svg-fill"
        p-id="6878"
      ></path>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useTag } from '@/utils/tagging'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import type { Step } from '@/apis/guidance'
import type { HighlightRect } from '@/components/common/MaskWithHighlight.vue'

const editorCtx = useEditorCtx()

const props = defineProps<{
  step: Step
  slotInfo: HighlightRect
}>()

const emit = defineEmits<{
  followingStepCompleted: []
}>()

let currentGuidePositions: {
  arrowStyle: any
  niuxiaoqiStyle: any
  bubbleStyle: any
} | null = null

// 设置事件键盘监听器，禁用escape和enter键
function setupKeyboardEventListeners() {
  document.addEventListener('keydown', preventEscapeAndEnter)
}

// 防止按下escape和enter键
function preventEscapeAndEnter(event: KeyboardEvent) {
  if (event.key === 'Escape' || event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
  }
}

onMounted(() => {
  setupTargetElementListener()
  setupKeyboardEventListeners()
})

onBeforeUnmount(() => {
  const element = getTargetElement()
  if (element) {
    element.removeEventListener('click', handleTargetElementClick)
  }

  document.removeEventListener('keydown', preventEscapeAndEnter)
})

function getTargetElement(): HTMLElement | null {
  if (!props.step.target) return null

  try {
    const { getElement } = useTag()
    return getElement(props.step.target)
  } catch (error) {
    console.warn('获取目标元素失败:', error)
    return null
  }
}

function setupTargetElementListener() {
  if (props.step.type !== 'following' || !props.step.target) return

  const element = getTargetElement()
  if (element) {
    element.addEventListener('click', handleTargetElementClick)
  }
}

async function handleTargetElementClick() {
  // 如果有结束快照并且需要检查
  if (props.step.snapshot?.endSnapshot && props.step.isCheck) {
    const result = await compareSnapshot(props.step.snapshot.endSnapshot)
    if (result.success) {
      emit('followingStepCompleted')
    } else {
      console.warn('快照比较失败:', result.reason)
    }
  } else {
    // 没有结束快照要求，直接完成步骤
    emit('followingStepCompleted')
  }
}

async function compareSnapshot(snapshotStr: string): Promise<{ success: boolean; reason?: string }> {
  if (!snapshotStr) return { success: false, reason: '没有结束快照' }

  const userSnapshot = await getSnapshot()
  if (snapshotStr !== userSnapshot) {
    return { success: false, reason: '快照不匹配' }
  }
  return { success: true }
}

async function getSnapshot(): Promise<string> {
  const project = editorCtx.project
  const files = await project.exportGameFiles()
  return JSON.stringify({ files })
}

// UI位置计算
function calculateGuidePositions(highlightRect: HighlightRect) {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  const isLeft = highlightRect.left + highlightRect.width / 2 < windowWidth / 2
  const isTop = highlightRect.top + highlightRect.height / 2 < windowHeight / 2

  const arrowSize = { width: 200, height: 200 }
  const niuxiaoqiSize = { width: 300, height: 320 }
  const bubbleSize = { width: 300, height: 200 }

  let arrowPosition = { left: 0, top: 0 }
  let niuxiaoqiPosition = { left: 0, top: 0 }
  let bubblePosition = { left: 0, top: 0 }

  if (isLeft && isTop) {
    // 左上象限
    arrowPosition = {
      left: highlightRect.left + highlightRect.width,
      top: highlightRect.top + highlightRect.height
    }
    niuxiaoqiPosition = {
      left: arrowPosition.left + arrowSize.width,
      top: arrowPosition.top + arrowSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left + niuxiaoqiSize.width,
      top: niuxiaoqiPosition.top - bubbleSize.height
    }
  } else if (!isLeft && isTop) {
    // 右上象限
    arrowPosition = {
      left: highlightRect.left - arrowSize.width,
      top: highlightRect.top + highlightRect.height
    }
    niuxiaoqiPosition = {
      left: arrowPosition.left - niuxiaoqiSize.width,
      top: arrowPosition.top + arrowSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left - bubbleSize.width,
      top: niuxiaoqiPosition.top - bubbleSize.height
    }
  } else if (isLeft && !isTop) {
    // 左下象限
    arrowPosition = {
      left: highlightRect.left + highlightRect.width,
      top: highlightRect.top - arrowSize.height
    }
    niuxiaoqiPosition = {
      left: arrowPosition.left + arrowSize.width,
      top: arrowPosition.top - niuxiaoqiSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left + niuxiaoqiSize.width,
      top: niuxiaoqiPosition.top + niuxiaoqiSize.height
    }
  } else {
    // 右下象限
    arrowPosition = {
      left: highlightRect.left - arrowSize.width,
      top: highlightRect.top - arrowSize.height
    }
    niuxiaoqiPosition = {
      left: arrowPosition.left - niuxiaoqiSize.width,
      top: arrowPosition.top - niuxiaoqiSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left - bubbleSize.width,
      top: niuxiaoqiPosition.top + niuxiaoqiSize.height
    }
  }

  return {
    arrowStyle: {
      position: 'absolute',
      left: `${arrowPosition.left}px`,
      top: `${arrowPosition.top}px`,
      width: `${arrowSize.width}px`,
      height: `${arrowSize.height}px`
    },
    niuxiaoqiStyle: {
      position: 'absolute',
      left: `${niuxiaoqiPosition.left}px`,
      top: `${niuxiaoqiPosition.top}px`,
      width: `${niuxiaoqiSize.width}px`,
      height: `${niuxiaoqiSize.height}px`
    },
    bubbleStyle: {
      position: 'absolute',
      left: `${bubblePosition.left}px`,
      top: `${bubblePosition.top}px`,
      width: `${bubbleSize.width}px`,
      height: `${bubbleSize.height}px`
    }
  }
}

function getArrowStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions) {
    currentGuidePositions = calculateGuidePositions(highlightRect)
  }
  return currentGuidePositions.arrowStyle
}

function getNiuxiaoqiStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions) {
    currentGuidePositions = calculateGuidePositions(highlightRect)
  }
  return currentGuidePositions.niuxiaoqiStyle
}

function getBubbleStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions) {
    currentGuidePositions = calculateGuidePositions(highlightRect)
  }
  return currentGuidePositions.bubbleStyle
}
</script>

<style scoped>
.guide-ui-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10000;
}

.guide-ui-container * {
  pointer-events: auto;
}

.svg-fill {
  fill: #ffeb3b;
  opacity: 0.8;
}

.icon-fill {
  fill: #5c5c66;
}
</style>
