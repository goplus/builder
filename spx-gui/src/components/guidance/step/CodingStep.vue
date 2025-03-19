<template>
  <div class="coding-step">
    <div class="code-button-container">
      <UIButton type="success" size="medium" @click="handleCheckButtonClick">
        {{ t({ zh: '检查', en: 'Check' }) }}
      </UIButton>
      <UIButton type="primary" size="medium" @click="handleInfoButtonClick">
        {{ t({ zh: '信息', en: 'Info' }) }}
      </UIButton>
      <UIButton type="secondary" size="medium" @click="handleAnswerButtonClick">
        {{ t({ zh: '答案', en: 'Answer' }) }}
      </UIButton>
    </div>
    <div class="suggestion-box">
      <ResultDialog
        :visible="isCheckingDialogVisible"
        :title="t({ zh: '代码检查中', en: 'Checking code' })"
        :content="''"
        :loading="true"
      >
      </ResultDialog>
      <ResultDialog
        :visible="isNextDialogVisible"
        :title="t({ zh: '检测结果', en: 'Check Result' })"
        :content="t({ zh: '太棒了！你的代码检测通过！', en: 'Great! Your code check passed!' })"
        :button="t({ zh: '下一步', en: 'Next' })"
        :button-action="'next'"
        @next="handleNextButtonClick"
      >
      </ResultDialog>
      <ResultDialog
        :visible="isRetryDialogVisible"
        :title="t({ zh: '检测结果', en: 'Check Result' })"
        :content="t({ zh: '错误\n', en: 'Error\n' }) + props.step.tip.zh"
        :button="t({ zh: '重试', en: 'Retry' })"
        :button-action="'retry'"
        @retry="handleRetryButtonClick"
      >
      </ResultDialog>
      <ResultDialog
        :visible="isAnswerDialogVisible"
        :title="t({ zh: '参考答案', en: 'Reference Answer' })"
        :content="''"
        :is-code="true"
        :button="t({ zh: '关闭', en: 'Close' })"
        :button-action="'close'"
        :code="answer || ''"
        @close="handleAnswerCloseButtonClick"
      >
      </ResultDialog>
      <ResultDialog
        :visible="isInfoDialogVisible"
        :title="t({ zh: '当前步骤', en: 'Current Step' })"
        :content="t({ zh: props.step.description.zh, en: props.step.description.en })"
        :button="t({ zh: '关闭', en: 'Close' })"
        :button-action="'close'"
        @close="handleInfoCloseButtonClick"
      >
      </ResultDialog>
      <ResultDialog
        :visible="isTimeoutDialogVisible"
        :title="t({ zh: '温馨提醒', en: 'Friendly Reminder' })"
        :content="
          t({
            zh: '牛小七发现你卡顿好久了...可以试着点击下方按钮直接查看答案哦～',
            en: 'Niuxiaoqi found you stuck for a long time... You can click the button below to view the answer directly~'
          })
        "
        :button="t({ zh: '查看答案', en: 'View Answer' })"
        :button-action="'answer'"
        @answer="handleAnswerFromTimeout"
      >
      </ResultDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import UIButton from '../../ui/UIButton.vue'
import ResultDialog from './ResultDialog.vue'
import type { Step } from '@/apis/guidance'
import { urlSafeBase64Decode } from 'qiniu-js'
import { toText } from '@/models/common/file'
import { useI18n } from '@/utils/i18n'

const editorCtx = useEditorCtx()

const props = defineProps<{
  step: Step
}>()

const emit = defineEmits<{
  codingStepCompleted: []
}>()

const { t } = useI18n()

const isCheckingDialogVisible = ref(false)
const isNextDialogVisible = ref(false)
const isRetryDialogVisible = ref(false)
const isAnswerDialogVisible = ref(false)
const isInfoDialogVisible = ref(false)
const isTimeoutDialogVisible = ref(false)

const answer = ref<string | null>(null)
let timeoutTimer: number | null = null

onMounted(async () => {
  try {
    if (props.step.coding?.path) {
      answer.value = await extractAnswerFromFile(props.step.coding.path)

      if (!answer.value) {
        answer.value = getMockAnswer()
      }
    }
  } catch (error) {
    console.error('初始化answer时出错:', error)
    answer.value = '// 无法加载答案，请检查控制台错误'
  }

  //   if (props.step.duration > 0) {
  //     timeoutTimer = window.setTimeout(() => {
  //       isTimeoutDialogVisible.value = true
  //     }, props.step.duration * 1000)
  //   }
})

onBeforeUnmount(() => {
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
  }
})

async function extractAnswerFromFile(path: string): Promise<string | null> {
  try {
    if (!path || path.length < 20) {
      return getMockAnswer()
    }

    let fileContent: string
    try {
      fileContent = urlSafeBase64Decode(path)
    } catch (err) {
      console.error('Base64解码失败:', err)
      return getMockAnswer()
    }

    if (!fileContent || fileContent.length < 10) {
      return getMockAnswer()
    }

    const startPos = props.step.coding?.startPosition
    const endPos = props.step.coding?.endPosition

    if (!startPos || !endPos) {
      return null
    }

    const lines = fileContent.split('\n')

    const adjustedStartLine = Math.min(startPos.line, lines.length)
    const adjustedEndLine = Math.min(endPos.line, lines.length)

    let extractedContent = ''

    if (adjustedStartLine === adjustedEndLine) {
      const line = lines[adjustedStartLine - 1]
      const startCol = Math.min(startPos.column - 1, line.length)
      const endCol = Math.min(endPos.column - 1, line.length)
      extractedContent = line.substring(startCol, endCol)
    } else {
      const firstLine = lines[adjustedStartLine - 1]
      const firstLineIndent = firstLine.match(/^\s*/)?.at(0) || ''
      const startCol = Math.min(startPos.column - 1, firstLine.length)
      extractedContent += firstLineIndent + firstLine.substring(startCol) + '\n'

      for (let i = adjustedStartLine; i < adjustedEndLine - 1 && i < lines.length; i++) {
        extractedContent += lines[i] + '\n'
      }

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

function handleCheckButtonClick() {
  isCheckingDialogVisible.value = true

  if (props.step.isCheck) {
    checkAnswer().then((result) => {
      if (result) {
        isCheckingDialogVisible.value = false
        isNextDialogVisible.value = true
      } else {
        isCheckingDialogVisible.value = false
        isRetryDialogVisible.value = true
      }
    })
  }
}

function handleInfoButtonClick() {
  isInfoDialogVisible.value = !isInfoDialogVisible.value
}

function handleAnswerButtonClick() {
  isAnswerDialogVisible.value = !isAnswerDialogVisible.value
}

function handleNextButtonClick() {
  isNextDialogVisible.value = false
  emit('codingStepCompleted')
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

  const extractedAnswer = await extractAnswerFromFile(props.step.coding?.path)

  if (!extractedAnswer) {
    return false
  }

  const userFile = files[props.step.coding.path]

  if (!userFile) {
    return false
  }

  const userAnswer = await extractAnswerFromFile(await toText(userFile))

  return userAnswer === extractedAnswer
}

async function getSnapshot(): Promise<string> {
  const project = editorCtx.project
  const files = await project.exportGameFiles()
  return JSON.stringify({ files })
}
</script>

<style scoped>
.suggestion-box {
  z-index: 10001;
}
</style>
