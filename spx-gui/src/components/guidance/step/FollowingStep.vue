<template>
  <div class="guide-ui-container">
    <svg
      class="ic-arrow"
      :style="getArrowStyle(props.slotInfo)"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="1444"
      data-spm-anchor-id="a313x.search_index.0.i0.6e8f3a81bBVDWW"
      width="300"
      height="200"
    >
      <path
        d="M149.333333 896a21.333333 21.333333 0 0 1-15.086666-36.42L823.166667 170.666667H661.333333a21.333333 21.333333 0 0 1 0-42.666667h213.46a21.333333 21.333333 0 0 1 21.206667 21.206667V362.666667a21.333333 21.333333 0 0 1-42.666667 0V200.833333L164.42 889.753333A21.266667 21.266667 0 0 1 149.333333 896z"
        fill="#5C5C66"
        class="icon-fill"
        p-id="1445"
      ></path>
    </svg>
    <img
      class="niuxiaoqi"
      :style="getNiuxiaoqiStyle(props.slotInfo)"
      width="300"
      height="320"
      src="https://www-static.qbox.me/sem/pili-live-1001/source/img/qiniu.png"
    />
    <div class="bubble-container" :style="getBubbleContainerStyle(props.slotInfo)">
      <svg
        class="ic-bubble-bg"
        :style="getBubbleBgStyle(props.slotInfo)"
        viewBox="0 0 1536 1024"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M269.824 1024H0l122.481778-133.461333V56.888889a56.888889 56.888889 0 0 1 56.888889-56.888889H1479.111111a56.888889 56.888889 0 0 1 56.888889 56.888889v910.222222a56.888889 56.888889 0 0 1-56.888889 56.888889z"
          class="svg-fill"
        ></path>
      </svg>
      <div class="bubble-content">
        {{ t({ zh: props.step.description.zh, en: props.step.description.en }) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, nextTick, ref } from 'vue'
import { useTag } from '@/utils/tagging'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { TaggingHandlerType, type Step } from '@/apis/guidance'
import type { HighlightRect } from '@/components/common/MaskWithHighlight.vue'
import { useI18n } from '@/utils/i18n'

const editorCtx = useEditorCtx()

const props = defineProps<{
  step: Step
  slotInfo: HighlightRect
}>()

const emit = defineEmits<{
  followingStepCompleted: []
}>()

const { t } = useI18n()

interface GuidePositions {
  arrowStyle: {
    position: 'absolute'
    left: string
    top: string
    width: string
    height: string
    transform: string
    transformOrigin: string
  }
  niuxiaoqiStyle: {
    position: 'absolute'
    left: string
    top: string
    width: string
    height: string
  }
  bubbleStyle: {
    position: 'absolute'
    left: string
    top: string
    width: string
    height: string
    arrowDirection: string
  }
}

const currentGuidePositions = ref<GuidePositions | null>(null)

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

  nextTick(() => {
    currentGuidePositions.value = calculateGuidePositions(props.slotInfo)
  })
})

onBeforeUnmount(() => {
  const element = getTargetElement()
  if (element) {
    element.removeEventListener('click', handleTargetElementClick)
    element.removeEventListener('submit', handleTargetElementSubmit)
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

  nextTick(() => {
    try {
      console.warn('taggingHandler:', props.step.taggingHandler)
      if (
        !props.step.taggingHandler ||
        typeof props.step.taggingHandler !== 'object' ||
        Object.keys(props.step.taggingHandler).length === 0
      ) {
        console.warn('taggingHandler 为空或无效')
        return
      }

      const elementTag = Object.keys(props.step.taggingHandler)[0]
      const taggingHandlerType = props.step.taggingHandler[elementTag]
      console.warn('elementTag:', elementTag)
      const { getElement } = useTag()
      const element = getElement(elementTag)
      console.warn('element:', element)
      if (taggingHandlerType === TaggingHandlerType.SubmitToNext) {
        if (element) {
          element.addEventListener('submit', handleTargetElementSubmit)
        } else {
          console.warn('没找到监听元素', elementTag)
        }
      } else if (taggingHandlerType === TaggingHandlerType.ClickToNext) {
        if (element) {
          element.addEventListener('click', handleTargetElementClick)
        } else {
          console.warn('没找到监听元素', elementTag)
        }
      }
    } catch (error) {
      console.warn('Error setting up target element listener:', error)
    }
  })
}

async function handleTargetElementSubmit(event: Event) {
  console.warn('表单提交事件被触发', event)

  // 阻止默认提交行为，以便我们可以控制
  event.preventDefault()

  try {
    // 检查是否需要比较快照
    if (props.step.snapshot?.endSnapshot && props.step.isCheck) {
      console.warn('需要比较快照，开始比较')

      try {
        const result = await compareSnapshot(props.step.snapshot.endSnapshot)
        console.warn('快照比较结果:', result)

        if (result.success) {
          console.warn('【快照比较成功】触发 followingStepCompleted 事件')
          emit('followingStepCompleted')
          console.warn('followingStepCompleted 事件已触发')
        } else {
          console.warn('【快照比较失败】:', result.reason)
          // 可以选择即使比较失败也触发事件，取决于您的业务逻辑
          // emit('followingStepCompleted')
        }
      } catch (error) {
        console.error('快照比较过程发生异常:', error)
        // 出错时是否继续取决于您的业务需求
        // emit('followingStepCompleted')
      }
    } else {
      // 无需比较快照，直接触发事件
      console.warn('无需比较快照，直接触发 followingStepCompleted 事件')
      emit('followingStepCompleted')
      console.warn('followingStepCompleted 事件已触发')
    }

    // 在这里可以选择是否要继续原始的表单提交
    // 如果原始表单有 onsubmit 处理程序，可以这样调用：
    // if (event.target.onsubmit) {
    //   event.target.onsubmit.call(event.target);
    // }
  } catch (error) {
    console.error('处理表单提交事件时发生异常:', error)
  }
}

async function handleTargetElementClick() {
  emit('followingStepCompleted')
}

async function compareSnapshot(snapshotStr: string): Promise<{ success: boolean; reason?: string }> {
  console.warn('开始比较快照')

  if (!snapshotStr) {
    console.warn('结束快照为空')
    return { success: false, reason: '没有结束快照' }
  }

  try {
    const userSnapshot = await getSnapshot()
    console.warn('获取当前快照成功')

    if (snapshotStr !== userSnapshot) {
      console.warn('快照不匹配', {
        expected: snapshotStr.substring(0, 100) + '...',
        actual: userSnapshot.substring(0, 100) + '...'
      })
      return { success: false, reason: '快照不匹配' }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('获取快照时发生错误:', error)
    return { success: false, reason: `获取快照失败: ${error instanceof Error ? error.message : String(error)}` }
  }
}

async function getSnapshot(): Promise<string> {
  console.warn('开始获取快照')

  if (!editorCtx) {
    console.error('editorCtx 不存在')
    throw new Error('Editor context not found')
  }

  if (!editorCtx.project) {
    console.error('editorCtx.project 不存在')
    throw new Error('Project not found in editor context')
  }

  const project = editorCtx.project
  console.warn('获取到 project 对象')

  try {
    const files = await project.exportGameFiles()
    console.warn('导出游戏文件成功')
    const snapshot = JSON.stringify({ files })
    return snapshot
  } catch (error) {
    console.error('导出游戏文件失败:', error)
    throw error
  }
}

function calculateGuidePositions(highlightRect: HighlightRect) {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  // 确定高亮区域所在象限
  const isLeft = highlightRect.left + highlightRect.width / 2 < windowWidth / 2
  const isTop = highlightRect.top + highlightRect.height / 2 < windowHeight / 2

  const scale = Math.min(windowWidth, windowHeight) / 1920
  const maxScale = 0.8 // 限制最大缩放比例
  const finalScale = Math.min(scale, maxScale)

  const arrowSize = {
    width: 200 * finalScale,
    height: 200 * finalScale
  }
  const niuxiaoqiSize = {
    width: 300 * finalScale,
    height: 320 * finalScale
  }
  const bubbleSize = {
    width: 300 * finalScale,
    height: 200 * finalScale
  }

  let arrowPosition = { left: 0, top: 0 }
  let niuxiaoqiPosition = { left: 0, top: 0 }
  let bubblePosition = { left: 0, top: 0 }

  let arrowRotation = 0

  let bubbleArrowDirection = 'left-down'

  if (isLeft && isTop) {
    // 左上象限
    arrowPosition = {
      left: highlightRect.left + highlightRect.width,
      top: highlightRect.top + highlightRect.height
    }
    arrowRotation = 270
    niuxiaoqiPosition = {
      left: arrowPosition.left + arrowSize.width,
      top: arrowPosition.top + arrowSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left + niuxiaoqiSize.width,
      top: niuxiaoqiPosition.top - bubbleSize.height
    }
    bubbleArrowDirection = 'left-down'
  } else if (!isLeft && isTop) {
    // 右上象限
    arrowPosition = {
      left: highlightRect.left - arrowSize.width,
      top: highlightRect.top + highlightRect.height
    }
    arrowRotation = 0
    niuxiaoqiPosition = {
      left: arrowPosition.left - niuxiaoqiSize.width,
      top: arrowPosition.top + arrowSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left - bubbleSize.width,
      top: niuxiaoqiPosition.top - bubbleSize.height
    }
    bubbleArrowDirection = 'right-down'
  } else if (isLeft && !isTop) {
    // 左下象限
    arrowPosition = {
      left: highlightRect.left + highlightRect.width,
      top: highlightRect.top - arrowSize.height
    }
    arrowRotation = 180
    niuxiaoqiPosition = {
      left: arrowPosition.left + arrowSize.width,
      top: arrowPosition.top - niuxiaoqiSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left + niuxiaoqiSize.width,
      top: niuxiaoqiPosition.top + niuxiaoqiSize.height
    }
    bubbleArrowDirection = 'left-top'
  } else {
    // 右下象限
    arrowPosition = {
      left: highlightRect.left - arrowSize.width,
      top: highlightRect.top - arrowSize.height
    }
    arrowRotation = 90
    niuxiaoqiPosition = {
      left: arrowPosition.left - niuxiaoqiSize.width,
      top: arrowPosition.top - niuxiaoqiSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left - bubbleSize.width,
      top: niuxiaoqiPosition.top + niuxiaoqiSize.height
    }
    bubbleArrowDirection = 'right-top'
  }

  return {
    arrowStyle: {
      position: 'absolute' as const,
      left: `${arrowPosition.left}px`,
      top: `${arrowPosition.top}px`,
      width: `${arrowSize.width}px`,
      height: `${arrowSize.height}px`,
      transform: `rotate(${arrowRotation}deg)`,
      transformOrigin: 'center center'
    },
    niuxiaoqiStyle: {
      position: 'absolute' as const,
      left: `${niuxiaoqiPosition.left}px`,
      top: `${niuxiaoqiPosition.top}px`,
      width: `${niuxiaoqiSize.width}px`,
      height: `${niuxiaoqiSize.height}px`
    },
    bubbleStyle: {
      position: 'absolute' as const,
      left: `${bubblePosition.left}px`,
      top: `${bubblePosition.top}px`,
      width: `${bubbleSize.width}px`,
      height: `${bubbleSize.height}px`,
      arrowDirection: bubbleArrowDirection
    }
  }
}

function getArrowStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions.value) {
    currentGuidePositions.value = calculateGuidePositions(highlightRect)
  }
  return currentGuidePositions.value.arrowStyle
}

function getNiuxiaoqiStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions.value) {
    currentGuidePositions.value = calculateGuidePositions(highlightRect)
  }
  return currentGuidePositions.value.niuxiaoqiStyle
}

function getBubbleContainerStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions.value) {
    currentGuidePositions.value = calculateGuidePositions(highlightRect)
  }

  const { left, top, width, height } = currentGuidePositions.value.bubbleStyle

  return {
    position: 'absolute' as const,
    left,
    top,
    width,
    height
  }
}

function getBubbleBgStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions.value) {
    currentGuidePositions.value = calculateGuidePositions(highlightRect)
  }

  const arrowDirection = currentGuidePositions.value.bubbleStyle.arrowDirection

  let transform = ''

  switch (arrowDirection) {
    case 'left-bottom':
      transform = ''
      break
    case 'right-bottom':
      transform = 'scale(1, -1)'
      break
    case 'left-top':
      transform = 'scale(-1, 1)'
      break
    case 'right-top':
      transform = 'scale(-1, -1)'
      break
  }

  return {
    transform,
    transformOrigin: 'center center',
    width: '100%',
    height: '100%'
  }
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

.bubble-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  box-sizing: border-box;
  font-size: 18px;
  color: #333;
  text-align: center;
  pointer-events: none;
}
</style>
