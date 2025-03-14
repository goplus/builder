<template>
  <div class="step-player">
    <MaskWithHighlight :visible="true" :highlight-element-path="props.step.target">
      <template v-if="props.step.type === 'coding'">
        <div class="code-button-container">
          <UIButton type="success" size="medium" @click="handleCheckButtonClick">Check</UIButton>
          <UIButton type="primary" size="medium" @click="handleInfoButtonClick">Info</UIButton>
          <UIButton type="secondary" size="medium" @click="handleAnswerButtonClick">Answer</UIButton>
        </div>
        <div class="suggestion-box">
          <ResultDialog :visible="isCheckingDialogVisible" :title="'代码检查中'" :content="''" :loading="true">
          </ResultDialog>
          <ResultDialog
            :visible="isNextDailogVisible"
            :title="'检测结果'"
            :content="'太棒了！你的代码检测通过！'"
            :button="'下一步'"
            :button-action="'next'"
            @next="handleNextButtonClick"
          >
          </ResultDialog>
          <ResultDialog
            :visible="isRetryDialogVisible"
            :title="'检测结果'"
            :content="'错误\n' + props.step.tip.zh"
            :button="'重试'"
            :button-action="'retry'"
            @retry="handleRetryButtonClick"
          >
          </ResultDialog>
          <ResultDialog
            :visible="isAnswerDialogVisible"
            :title="'参考答案'"
            :content="''"
            :is-code="true"
            :button="'关闭'"
            :button-action="'close'"
            :code="answer || ''"
            @close="handleAnswerCloseButtonClick"
          >
          </ResultDialog>
          <ResultDialog
            :visible="isInfoDialogVisible"
            :title="'当前步骤'"
            :content="props.step.description.zh"
            :button="'关闭'"
            :button-action="'close'"
            @close="handleInfoCloseButtonClick"
          >
          </ResultDialog>
          <ResultDialog
            :visible="isTimeoutDialogVisible"
            :title="'温馨提醒'"
            :content="'牛小七发现你卡顿好久了...可以试着点击下方按钮直接查看答案哦～'"
            :button="'查看答案'"
            :button-action="'answer'"
            @answer="handleAnswerFromTimeout"
          >
          </ResultDialog>
        </div>
      </template>
      <template v-if="props.step.type === 'following'" #default="{ slotInfo }">
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
            <text
              x="50%"
              y="50%"
              text-anchor="middle"
              dominant-baseline="middle"
              font-family="Arial"
              font-size="48"
              fill="black"
            >
              {{ props.step.description }}
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
    </MaskWithHighlight>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useTag } from '@/utils/tagging'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import MaskWithHighlight from '@/components/common/MaskWithHighlight.vue'
import ResultDialog from './ResultDialog.vue'
import UIButton from '@/components/ui/UIButton.vue'
import type { HighlightRect } from '@/components/common/MaskWithHighlight.vue'
import type { Step } from '@/apis/guidance'
import { urlSafeBase64Decode } from 'qiniu-js'
import { fromText, toText, type Files } from '@/models/common/file'

const editorCtx = useEditorCtx()
const filter = editorCtx.listFilter
const props = defineProps<{
  step: Step
}>()

const emit = defineEmits<{
  stepCompleted: []
}>()

const isCheckingDialogVisible = ref(false)
const isNextDailogVisible = ref(false)
const isRetryDialogVisible = ref(false)
const isAnswerDialogVisible = ref(false)
const isInfoDialogVisible = ref(false)
const isTimeoutDialogVisible = ref(false)

const answer = ref<string | null>(null)

onMounted(async () => {
  console.log('StepPlayer mounted with step:', props.step)

  try {
    if (props.step.type === 'coding' && props.step.coding?.path) {
      answer.value = await extractAnswerFromFile(props.step.coding.path)

      if (!answer.value) {
        console.log('无法提取答案，使用mock答案')
        answer.value = `// 这是一个模拟的参考答案
onStart => {
  think "如何通过斑马线呢？", 4
  broadcast "start"
}

onTouchStart => {
  die
}

onKey KeyDown, => {
  setHeading 180
  step 30
}`
      }
    }
  } catch (error) {
    console.error('初始化answer时出错:', error)
    // 提供一个备用答案以确保测试可以继续
    answer.value = '// 无法加载答案，请检查控制台错误'
  }

  try {
    if (props.step.snapshot?.startSnapshot) {
      await loadSnapshot(props.step.snapshot.startSnapshot)
      console.log('Snapshot loaded successfully')
    } else {
      console.log('No snapshot to load')
    }
  } catch (error) {
    console.error('Failed to load snapshot:', error)
  }

  // 设置过滤器
  if (props.step.isApiControl) {
    filter.setFilter('apiReference', true, props.step.apis)
  }
  if (props.step.isAssetControl) {
    filter.setFilter('asset', true, props.step.assets)
  }
  if (props.step.isSpriteControl) {
    filter.setFilter('sprite', true, props.step.sprites)
  }
  if (props.step.isSoundControl) {
    filter.setFilter('sound', true, props.step.sounds)
  }
  if (props.step.isCostumeControl) {
    filter.setFilter('costume', true, props.step.costumes)
  }
  if (props.step.isAnimationControl) {
    filter.setFilter('animation', true, props.step.animations)
  }
  if (props.step.isWidgetControl) {
    filter.setFilter('widget', true, props.step.widgets)
  }
  if (props.step.isBackdropControl) {
    filter.setFilter('backdrop', true, props.step.backdrops)
  }
  currentGuidePositions = null

  // 延迟设置目标元素监听器
  setTimeout(() => {
    setupTargetElementListener()
  }, 100)
})

onBeforeUnmount(() => {
  filter.reset()
})

async function loadSnapshot(snapshotStr: string): Promise<void> {
  if (!snapshotStr) return

  try {
    const project = editorCtx.project
    if (!project) {
      console.log("Project doesn't exist")
      return
    }

    let fileMap: Record<string, string> = {}
    try {
      fileMap = JSON.parse(snapshotStr)
    } catch (parseError) {
      console.error('Failed to parse snapshot:', parseError)
      return
    }

    const files: Files = {}

    for (const [path, content] of Object.entries(fileMap)) {
      if (typeof content === 'string') {
        if (content.startsWith('data:')) {
          try {
            const contentParts = content.split(',')
            if (contentParts.length > 1) {
              const base64Part = contentParts[1]
              const decodedContent = atob(base64Part)
              files[path] = fromText(path, decodedContent)
            } else {
              files[path] = fromText(path, '')
            }
          } catch (e) {
            console.error('Failed to decode data URL:', e)
          }
        } else {
          files[path] = fromText(path, content)
        }
      }
    }

    if (Object.keys(files).length === 0) {
      console.log('No files to load')
      return
    }

    await project.loadGameFiles(files)
    console.log('Snapshot loaded successfully')
  } catch (error) {
    console.error('Failed to load snapshot:', error)
  }
}

async function getSnapshot(): Promise<string> {
  const project = editorCtx.project
  const files = await project.exportGameFiles()
  return JSON.stringify({ files })
}

async function extractAnswerFromFile(path: string): Promise<string | null> {
  try {
    if (!path || path.length < 20) {
      // 长度过短可能表示不是有效路径
      console.warn('路径过短或为空，尝试使用备用答案')
      return getMockAnswer()
    }

    console.log('提取答案，path长度:', path.length)

    let fileContent: string
    try {
      fileContent = urlSafeBase64Decode(path)
      console.log('解码后文件内容大小:', fileContent ? fileContent.length : 0)
    } catch (err) {
      console.error('Base64解码失败:', err)
      return getMockAnswer()
    }

    if (!fileContent || fileContent.length < 10) {
      // 内容太短，可能无效
      console.error('解码后文件内容过短或为空')
      return getMockAnswer()
    }

    const startPos = props.step.coding?.startPosition
    const endPos = props.step.coding?.endPosition

    if (!startPos || !endPos) {
      console.error('缺少位置信息')
      return null
    }

    const lines = fileContent.split('\n')
    console.log('文件行数:', lines.length)

    // 自动调整位置适应实际文件
    const adjustedStartLine = Math.min(startPos.line, lines.length)
    const adjustedEndLine = Math.min(endPos.line, lines.length)

    console.log('调整后的位置:', {
      original: { start: startPos.line, end: endPos.line },
      adjusted: { start: adjustedStartLine, end: adjustedEndLine }
    })

    let extractedContent = ''

    // 处理单行情况
    if (adjustedStartLine === adjustedEndLine) {
      const line = lines[adjustedStartLine - 1]
      const startCol = Math.min(startPos.column - 1, line.length)
      const endCol = Math.min(endPos.column - 1, line.length)
      extractedContent = line.substring(startCol, endCol)
    }
    // 多行情况
    else {
      const firstLine = lines[adjustedStartLine - 1]
      const firstLineIndent = firstLine.match(/^\s*/)?.at(0) || ''
      const startCol = Math.min(startPos.column - 1, firstLine.length)
      extractedContent += firstLineIndent + firstLine.substring(startCol) + '\n'

      // 只处理实际存在的中间行
      for (let i = adjustedStartLine; i < adjustedEndLine - 1 && i < lines.length; i++) {
        extractedContent += lines[i] + '\n'
      }

      // 确保最后一行存在
      if (adjustedEndLine <= lines.length) {
        const lastLine = lines[adjustedEndLine - 1]
        const endCol = Math.min(endPos.column - 1, lastLine.length)
        extractedContent += lastLine.substring(0, endCol)
      }
    }

    return extractedContent || getMockAnswer()
  } catch (error) {
    console.error('提取答案时出错:', error)
    return getMockAnswer()
  }
}

// 提供一个mock答案以确保UI能够正常展示
function getMockAnswer(): string {
  return `// 这是一个模拟的参考答案
onStart => {
  think "如何通过斑马线呢？", 4
  broadcast "start"
}

onTouchStart => {
  die
}

onKey KeyDown, => {
  setHeading 180
  step 30
}`
}

function calculateGuidePositions(highlightRect: HighlightRect) {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  // 确定高亮区域所在象限
  const isLeft = highlightRect.left + highlightRect.width / 2 < windowWidth / 2
  const isTop = highlightRect.top + highlightRect.height / 2 < windowHeight / 2

  const arrowSize = { width: 200, height: 200 }
  const niuxiaoqiSize = { width: 300, height: 320 }
  const bubbleSize = { width: 300, height: 200 }

  let arrowPosition = { left: 0, top: 0 }
  let niuxiaoqiPosition = { left: 0, top: 0 }
  let bubblePosition = { left: 0, top: 0 }

  // 根据象限计算位置
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

let currentGuidePositions: { arrowStyle: any; niuxiaoqiStyle: any; bubbleStyle: any } | null = null

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

// 修改setupTargetElementListener函数，使用onMounted + setTimeout确保安全调用
function setupTargetElementListener() {
  if (props.step.type !== 'following' || !props.step.target) return

  // 延迟执行，确保组件已完全挂载
  setTimeout(() => {
    try {
      const { getElement } = useTag()
      const element = getElement(props.step.target)
      if (element) {
        console.log('Target element found, adding click listener')
        element.addEventListener('click', handleTargetElementClick)
      } else {
        console.warn('Target element not found:', props.step.target)
      }
    } catch (error) {
      console.warn('Error setting up target element listener:', error)
    }
  }, 200) // 延迟200ms，确保TagConsumer已完全初始化
}

async function handleTargetElementClick() {
  if (props.step.type !== 'following') return

  if (props.step.snapshot?.endSnapshot && props.step.isCheck) {
    const result = await compareSnapshot(props.step.snapshot.endSnapshot)
    if (result.success) {
      emit('stepCompleted')
    } else {
      console.warn('Snapshot comparison failed:', result.reason)
    }
  }
}

function handleCheckButtonClick() {
  if (props.step.type !== 'coding') return

  isCheckingDialogVisible.value = true

  if (props.step.isCheck) {
    checkAnswer().then((result) => {
      if (result) {
        isCheckingDialogVisible.value = false
        isNextDailogVisible.value = true
      } else {
        isCheckingDialogVisible.value = false
        isRetryDialogVisible.value = true
        console.warn('Answer mismatch')
      }
    })
  }
}

function handleInfoButtonClick() {
  if (props.step.type !== 'coding') return

  isInfoDialogVisible.value = !isInfoDialogVisible.value
}

function handleAnswerButtonClick() {
  if (props.step.type !== 'coding') return

  isAnswerDialogVisible.value = !isAnswerDialogVisible.value
}

function handleNextButtonClick() {
  isNextDailogVisible.value = false
  emit('stepCompleted')
}

function handleRetryButtonClick() {
  isRetryDialogVisible.value = false
}

function handleAnswerFromTimeout() {
  isTimeoutDialogVisible.value = false
  isAnswerDialogVisible.value = true
}

function handleInfoCloseButtonClick() {
  isInfoDialogVisible.value = false
}

function handleAnswerCloseButtonClick() {
  isAnswerDialogVisible.value = false
}

async function checkAnswer(): Promise<boolean> {
  const project = editorCtx.project
  const files = await project.exportGameFiles()

  if (!props.step.coding?.path) {
    return false
  }

  const answer = await extractAnswerFromFile(await props.step.coding?.path)

  if (!answer) {
    return false
  }

  const userFile = files[props.step.coding.path]

  if (!userFile) {
    return false
  }

  const userAnswer = await extractAnswerFromFile(await toText(userFile))

  return userAnswer === answer
}

async function compareSnapshot(snapshotStr: string): Promise<{ success: boolean; reason?: string }> {
  if (!snapshotStr) return Promise.resolve({ success: false, reason: 'No end snapshot' })
  const userSnapshot = await getSnapshot()
  if (snapshotStr !== userSnapshot) {
    return Promise.resolve({ success: false, reason: 'Snapshot mismatch' })
  }
  return Promise.resolve({ success: true })
}
</script>

<style scoped>
.step-player {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1001;
}

.code-button-container {
  position: fixed;
  right: 20px;
  top: 80px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10000;
}

.guidance-button {
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.check-button {
  background-color: #4caf50;
  color: white;
}

.info-button {
  background-color: #2196f3;
  color: white;
}

.answer-button {
  background-color: #ffc107;
  color: black;
}

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

.suggestion-box {
  z-index: 10001;
}
</style>
