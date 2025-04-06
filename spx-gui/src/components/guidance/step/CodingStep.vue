<template>
  <div class="coding-step">
    <div
      class="code-button-dialog-group"
      :style="{
        transform: `translate(${x}px, ${y}px)`
      }"
    >
      <div class="code-dialog-group">
        <!-- 点击检测按钮弹窗 -->
        <Transition name="dialog-expand">
          <CodingDialog
            v-show="checkDialogVisible"
            class="dialog"
            :content-height="checkCodeStatus === CheckCodeStatus.CHECKING ? '50px' : '100px'"
          >
            <template #title>
              <div
                ref="checkDialogTitleRef"
                style="font-weight: bold; font-size: 18px; line-height: 30px; cursor: move"
              >
                {{
                  checkCodeStatus === CheckCodeStatus.CHECKING
                    ? t({ zh: '代码检测中', en: 'Code Checking' })
                    : t({ zh: '检测结果', en: 'Check Result' })
                }}
              </div>
            </template>
            <template #content>
              <div
                v-if="checkCodeStatus === CheckCodeStatus.CHECKING"
                style="height: 100%; display: flex; justify-content: center; align-items: center"
              >
                <div style="width: 35px; height: 35px" class="rotating-img">
                  <img src="../icons/checking.svg" alt="" style="width: 100%; height: 100%" />
                </div>
              </div>
              <div
                v-else-if="checkCodeStatus === CheckCodeStatus.SUCCESS"
                style="
                  height: 100%;
                  padding-top: 5px;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-around;
                "
              >
                <div>{{ t({ zh: '太棒了！您通过了！', en: 'Check Success！' }) }}</div>
                <div style="display: flex; justify-content: right; padding-right: 10px">
                  <div class="check-btn" @click="handleNextBtnClick">
                    <span>{{ t({ zh: '下一步', en: 'Next' }) }}</span>
                  </div>
                </div>
              </div>
              <div
                v-else-if="checkCodeStatus === CheckCodeStatus.FAILED"
                style="
                  height: 100%;
                  padding-top: 5px;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-around;
                "
              >
                <div>{{ t({ zh: '很遗憾，您代码有错误！', en: 'Check Failed！' }) }}</div>
                <div style="display: flex; justify-content: right; padding-right: 10px">
                  <div class="check-btn" @click="handleRetryBtnClick">
                    <span>{{ t({ zh: '重试', en: 'Retry' }) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </CodingDialog>
        </Transition>
        <!-- 点击查看该步骤描述按钮弹窗 -->
        <Transition name="dialog-expand">
          <CodingDialog v-show="descDialogVisible" content-height="240px" class="dialog" style="top: 45px">
            <template #title>
              <div ref="descDialogTitleRef" style="font-weight: bold; font-size: 18px; line-height: 30px; cursor: move">
                {{ t({ zh: '当前步骤', en: 'Current Step' }) }}
              </div>
            </template>
            <template #content>
              <div style="padding-top: 10px">
                {{ t(props.step.description) }}
              </div>
            </template>
          </CodingDialog>
        </Transition>
        <!-- 点击查看参考答案按钮弹窗 -->
        <Transition name="dialog-expand">
          <CodingDialog v-show="answerDialogVisible" content-height="240px" class="dialog" style="top: 95px">
            <template #title>
              <div
                ref="answerDialogTitleRef"
                style="font-weight: bold; font-size: 18px; line-height: 30px; cursor: move"
              >
                {{ t({ zh: '参考答案', en: 'Answer' }) }}
              </div>
            </template>
            <template #content>
              <div
                class="answer-container"
                @mouseenter="!isCopyStatusLocked && (copyStatus = CopyStatus.WAITING)"
                @mouseleave="!isCopyStatusLocked && (copyStatus = CopyStatus.HIDDEN)"
              >
                <div class="code-type-indicator" @click="copyAnswerCode">
                  <span v-if="copyStatus === CopyStatus.HIDDEN">Go+</span>
                  <img v-else-if="copyStatus === CopyStatus.WAITING" src="../icons/copy.svg" alt="复制" />
                  <img v-else-if="copyStatus === CopyStatus.SUCCESS" src="../icons/copy-success.svg" alt="复制成功" />
                </div>
                <pre class="answer-code"><code v-html="answer"></code></pre>
              </div>
            </template>
          </CodingDialog>
        </Transition>
      </div>
      <div class="code-button-group">
        <!-- 检测代码按钮 -->
        <div ref="checkFloatingBtnRef" class="floating-btn">
          <img src="../icons/check.svg" alt="" />
        </div>
        <!-- 查看该步骤描述按钮 -->
        <div ref="descFloatingBtnRef" class="floating-btn">
          <img src="../icons/desc.svg" alt="" />
        </div>
        <!-- 查看参考答案按钮 -->
        <div ref="answerFloatingBtnRef" class="floating-btn">
          <img src="../icons/answer.svg" alt="" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export class ClozeTestProvider
  extends Emitter<{
    didChangeClozeAreas: []
  }>
  implements IClozeTestProvider
{
  private _clozeAreas: ClozeArea[] | null = null

  constructor() {
    super()
  }

  setClozeAreas(areas: ClozeArea[]) {
    this._clozeAreas = areas
    this.emit('didChangeClozeAreas', [])
  }

  provideClozeAreas(ctx: ClozeTestContext): ClozeArea[] {
    return this._clozeAreas || []
  }
}
</script>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import type { Step, Mask } from '@/apis/guidance'
import type { Position } from '@/components/editor/code-editor/common'
import { toText } from '@/models/common/file'
import { useI18n } from '@/utils/i18n'
import { useLevelPlayerCtx } from '../LevelPlayer.vue'
import CodingDialog from './CodingDialog.vue'
import { useDrag } from '@/utils/dom'
import { checkCode } from '@/apis/guidance'
import { type ClozeArea, ClozeAreaType } from '@/components/editor/code-editor/ui/cloze-test'
import Emitter from '@/utils/emitter'
import type { IClozeTestProvider, ClozeTestContext } from '@/components/editor/code-editor/ui/cloze-test'

const editorCtx = useEditorCtx()

const props = defineProps<{
  step: Step
}>()

const emit = defineEmits<{
  codingStepCompleted: []
}>()

const { t } = useI18n()

// 控制弹窗显示状态
const checkDialogVisible = ref(false)
const descDialogVisible = ref(false)
const answerDialogVisible = ref(false)

// 该步骤答案
const answer = ref<string | null>(null)

let timeoutTimer: number | null = null

const levelPlayerCtx = useLevelPlayerCtx()
const { getPos, setPos, getVideoPlayerVisible, setVideoPlayerVisible } = levelPlayerCtx
const x = computed(() => getPos().x)
const y = computed(() => getPos().y)

const checkFloatingBtnRef = ref<HTMLElement | null>(null)
const descFloatingBtnRef = ref<HTMLElement | null>(null)
const answerFloatingBtnRef = ref<HTMLElement | null>(null)
const checkDialogTitleRef = ref<HTMLElement | null>(null)
const descDialogTitleRef = ref<HTMLElement | null>(null)
const answerDialogTitleRef = ref<HTMLElement | null>(null)

// 添加拖拽逻辑
useDrag(checkDialogTitleRef, getPos, setPos)
useDrag(descDialogTitleRef, getPos, setPos)
useDrag(answerDialogTitleRef, getPos, setPos)
useDrag(checkFloatingBtnRef, getPos, setPos, {
  onClick: handleCheckFloatingBtnClick
})
useDrag(descFloatingBtnRef, getPos, setPos, {
  onClick: handleDescFloatingBtnClick
})
useDrag(answerFloatingBtnRef, getPos, setPos, {
  onClick: handleAnswerFloatingBtnClick
})

// 从结束快照中提取答案
function getAnswerFromEndSnapshot(
  path: string,
  endSnapshot: string,
  startPosition: Position,
  endPosition: Position,
  codeMasks: Mask[]
) {
  // 获取目标文件内容
  const targetFile = getTargetFileContent(path, endSnapshot)
  const scopedCode = getScopedCode(targetFile, startPosition, endPosition)
  return getHighlightedCode(scopedCode, codeMasks, startPosition)
}
// 从快照中获取目标文件内容
function getTargetFileContent(path: string, endSnapShot: string) {
  return JSON.parse(endSnapShot)[path]
}
// 从代码文件中获取指定范围的代码
function getScopedCode(fileContent: string, startPosition: Position, endPosition: Position) {
  // 移除 data:;, 前缀
  const encodedContent = fileContent.replace('data:;,', '')

  // 解码内容
  const decodedContent = decodeURIComponent(encodedContent)

  // 按行分割
  const lines = decodedContent.split(/\r?\n/)

  // 提取指定范围的代码
  let scopedCode = ''

  // 如果是单行
  if (startPosition.line === endPosition.line) {
    const line = lines[startPosition.line - 1]
    scopedCode = line.substring(startPosition.column - 1, endPosition.column - 1)
  } else {
    // 提取第一行
    const firstLine = lines[startPosition.line - 1]
    scopedCode += firstLine.substring(startPosition.column - 1) + '\n'

    // 提取中间的行
    for (let i = startPosition.line; i < endPosition.line - 1; i++) {
      scopedCode += lines[i] + '\n'
    }

    // 提取最后一行
    const lastLine = lines[endPosition.line - 1]
    scopedCode += lastLine.substring(0, endPosition.column - 1)
  }
  return scopedCode
}
// 获取高亮代码
function getHighlightedCode(scopedCode: string, codeMasks: Mask[], startPosition: Position) {
  // 处理 tab 的辅助函数
  function calculateRealColumn(line: string, column: number): number {
    let realColumn = 0
    let visualColumn = 0

    for (let i = 0; i < line.length && visualColumn < column; i++) {
      if (line[i] === '\t') {
        // tab 宽度为 4，但需要计算到下一个 tab stop
        const tabWidth = 4 - (visualColumn % 4)
        visualColumn += tabWidth
        realColumn += 1
      } else {
        visualColumn += 1
        realColumn += 1
      }
    }
    return realColumn
  }
  // 高亮处理
  const lines = scopedCode.split('\n')
  const highlightedLines = lines.map((line, index) => {
    // 指定范围的代码相对于原文件的行数
    const currentLineNumber = startPosition.line + index
    const masksForThisLine = codeMasks.filter(
      (mask) => mask.startPos.line <= currentLineNumber && mask.endPos.line >= currentLineNumber
    )

    if (masksForThisLine.length === 0) return line

    let result = line
    // 偏移量
    let offset = 0

    masksForThisLine.forEach((mask) => {
      let startCol =
        mask.startPos.line === currentLineNumber
          ? mask.startPos.column - (currentLineNumber === startPosition.line ? startPosition.column : 1)
          : 0
      let endCol =
        mask.endPos.line === currentLineNumber
          ? mask.endPos.column - (currentLineNumber === startPosition.line ? startPosition.column - 1 : 0)
          : line.length

      // 转换为实际的字符位置
      startCol = calculateRealColumn(line, startCol)
      endCol = calculateRealColumn(line, endCol)

      const before = result.slice(0, startCol + offset)
      const highlighted = result.slice(startCol + offset, endCol + offset)
      const after = result.slice(endCol + offset)

      result = `${before}<span class="highlight-text">${highlighted}</span>${after}`
      offset += '<span class="highlight-text">'.length + '</span>'.length
    })

    return result
  })
  return highlightedLines.join('\n')
}

// 代码检测状态
enum CheckCodeStatus {
  CHECKING,
  SUCCESS,
  FAILED
}
const checkCodeStatus = ref(CheckCodeStatus.CHECKING)

// 点击代码检测按钮
async function handleCheckFloatingBtnClick() {
  if (!props.step.coding || !props.step.snapshot.endSnapshot) return
  if (checkDialogVisible.value && checkCodeStatus.value === CheckCodeStatus.CHECKING) return
  if (checkDialogVisible.value) {
    checkDialogVisible.value = false
    return
  }
  checkCodeStatus.value = CheckCodeStatus.CHECKING
  checkDialogVisible.value = true
  descDialogVisible.value = false
  answerDialogVisible.value = false
  setVideoPlayerVisible(false)

  // 检测用户代码
  const result = await checkAnswer()

  if (result) {
    checkCodeStatus.value = CheckCodeStatus.SUCCESS
  } else {
    checkCodeStatus.value = CheckCodeStatus.FAILED
  }
}

// 代码检测
async function checkAnswer(): Promise<boolean> {
  if (!props.step.coding || !props.step.snapshot.endSnapshot) return false
  const targetFileContent = getTargetFileContent(props.step.coding.path, props.step.snapshot.endSnapshot)
  const encodedContent = targetFileContent.replace('data:;,', '')
  let expectedCode = decodeURIComponent(encodedContent)
  let userCode = await getUserCode(props.step.coding.path)

  const normalize = (str: string) =>
    str
      .replace(/\s+/g, ' ') // 合并连续空格
      .replace(/[\r\n]/g, '') // 移除换行符
      .trim()

  expectedCode = normalize(expectedCode)
  userCode = normalize(userCode)

  // 比对格式化后的代码
  if (expectedCode === userCode) {
    return true
  }

  // 调用接口检测代码
  const result = await checkCode({
    userCode,
    expectedCode,
    context: ''
  })
  return result
}

// 获取用户代码
async function getUserCode(path: string): Promise<string> {
  const project = editorCtx.project
  const files = await project.exportGameFiles()
  const userCode = await toText(files[path]!)
  return userCode
}

// 点击查看该步骤描述按钮
function handleDescFloatingBtnClick() {
  if (checkDialogVisible.value && checkCodeStatus.value === CheckCodeStatus.CHECKING) return
  if (descDialogVisible.value) {
    descDialogVisible.value = false
  } else {
    descDialogVisible.value = true
    checkDialogVisible.value = false
    answerDialogVisible.value = false
    setVideoPlayerVisible(false)
  }
}

// 点击查看参考答案按钮
function handleAnswerFloatingBtnClick() {
  if (checkDialogVisible.value && checkCodeStatus.value === CheckCodeStatus.CHECKING) return
  if (answerDialogVisible.value) {
    answerDialogVisible.value = false
  } else {
    answerDialogVisible.value = true
    checkDialogVisible.value = false
    descDialogVisible.value = false
    setVideoPlayerVisible(false)
  }
}

// 和视频组件切换按钮联动
watch(getVideoPlayerVisible, (visible: boolean) => {
  if (visible) {
    checkDialogVisible.value = false
    descDialogVisible.value = false
    answerDialogVisible.value = false
  }
})

// 点击下一步按钮
function handleNextBtnClick() {
  emit('codingStepCompleted')
}

// 点击重试按钮
function handleRetryBtnClick() {
  handleCheckFloatingBtnClick()
}

const clozeTestProvider = new ClozeTestProvider()

onMounted(() => {
  editorCtx.setClozeTestVisible(true)
  editorCtx.setClozeTestProvider(clozeTestProvider)
  updateClozeAreas()
  if (props.step.coding && props.step.snapshot.endSnapshot) {
    answer.value = getAnswerFromEndSnapshot(
      props.step.coding.path,
      props.step.snapshot.endSnapshot,
      props.step.coding.startPosition,
      props.step.coding.endPosition,
      props.step.coding.codeMasks
    )
  } else {
    answer.value = '// 无法加载答案，请检查控制台错误'
  }
})

onBeforeUnmount(() => {
  editorCtx.setClozeTestVisible(false)
  editorCtx.setClozeTestProvider(null)
  if (timeoutTimer) {
    clearTimeout(timeoutTimer)
  }
})

watch(
  () => props.step,
  () => {
    checkDialogVisible.value = false
    updateClozeAreas()
    if (props.step.coding && props.step.snapshot.endSnapshot) {
      answer.value = getAnswerFromEndSnapshot(
        props.step.coding.path,
        props.step.snapshot.endSnapshot,
        props.step.coding.startPosition,
        props.step.coding.endPosition,
        props.step.coding.codeMasks
      )
    } else {
      answer.value = '// 无法加载答案，请检查控制台错误'
    }
  }
)

// 控制复制图标显示状态
enum CopyStatus {
  HIDDEN,
  WAITING,
  SUCCESS
}
const copyStatus = ref(CopyStatus.HIDDEN)
const isCopyStatusLocked = ref(false)
// 复制参考答案代码
async function copyAnswerCode() {
  if (!answer.value) return

  // 创建一个不包含HTML标签的纯文本版本
  const tempElement = document.createElement('div')
  tempElement.innerHTML = answer.value
  const plainText = tempElement.textContent || tempElement.innerText || ''

  try {
    await navigator.clipboard.writeText(plainText)
    isCopyStatusLocked.value = true
    copyStatus.value = CopyStatus.SUCCESS

    setTimeout(() => {
      isCopyStatusLocked.value = false
    }, 1000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 转换codeMasks为clozeAreas的格式
function convertCodeMasksToClozeAreas(path: string, endSnapshot: string, codeMasks: Mask[]): ClozeArea[] {
  const targetFile = getTargetFileContent(path, endSnapshot)
  const encodedContent = targetFile.replace('data:;,', '')
  const decodedContent = decodeURIComponent(encodedContent)
  const lines = decodedContent.split(/\r?\n/)

  return codeMasks.map((mask) => {
    // 确定区域类型
    const type = mask.startPos.line === mask.endPos.line ? ClozeAreaType.EditableSingleLine : ClozeAreaType.Editable

    if (type === ClozeAreaType.EditableSingleLine) {
      // 对于单行填空，需要处理tab的影响
      const line = lines[mask.startPos.line - 1] || ''

      // 处理开始位置的列号
      let realStartColumn = 1
      let visualColumn = 1

      for (let i = 0; i < line.length && visualColumn < mask.startPos.column; i++) {
        if (line[i] === '\t') {
          // tab宽度为4，向下取整到下一个tab stop
          const tabWidth = 4 - ((visualColumn - 1) % 4)
          visualColumn += tabWidth
        } else {
          visualColumn++
        }
        realStartColumn++
      }

      // 处理结束位置的列号
      const textLength = mask.endPos.column - mask.startPos.column + 1

      return {
        range: {
          start: {
            line: mask.startPos.line,
            column: realStartColumn
          },
          end: {
            line: mask.endPos.line,
            column: realStartColumn + textLength
          }
        },
        type: type
      }
    } else {
      // 对于多行编辑区域
      return {
        range: {
          start: {
            line: mask.startPos.line,
            column: 0
          },
          end: {
            line: mask.endPos.line,
            column: 0
          }
        },
        type: type
      }
    }
  })
}

function updateClozeAreas() {
  if (props.step.coding && props.step.snapshot.endSnapshot) {
    const clozeAreas = convertCodeMasksToClozeAreas(
      props.step.coding.path,
      props.step.snapshot.endSnapshot,
      props.step.coding.codeMasks
    )
    clozeTestProvider.setClozeAreas(clozeAreas)
  }
}
</script>

<style scoped lang="scss">
.code-button-dialog-group {
  position: fixed;
  left: 0;
  top: 47px;
  width: 540px;
  display: flex;
  justify-content: right;
  pointer-events: none;
  .code-dialog-group {
    margin-right: 5px;
    pointer-events: none;
    position: relative;
    .dialog {
      position: absolute;
      right: 0;
    }
    .answer-container {
      position: relative;
    }

    .code-type-indicator {
      position: absolute;
      top: 5px;
      right: 5px;
      font-size: 14px;
      font-weight: bold;
      color: #bfbfbf;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 30px;
      transition: all 0.2s ease;

      img {
        width: 18px;
        height: 18px;
      }
    }
    .answer-code {
      background-color: #f0f0f0;
      height: 100%;
      border-radius: 10px;
      padding: 10px;
      padding-top: 15px;
      overflow: auto;
    }
    code {
      line-height: 1.6;
      display: block;
    }
    .check-btn {
      background-color: #0ec1d0;
      font-weight: bold;
      color: #fff;
      border-radius: 10px;
      padding: 6px 17px;
      cursor: pointer;
      &:hover {
        box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.3);
      }
    }
  }
}
.floating-btn {
  height: 35px;
  width: 35px;
  border-radius: 50%;
  background-color: #e9fdff;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  margin-bottom: 10px;
  &:hover {
    background-color: #d4f9ff;
    box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.5);
  }
  img {
    width: 25px;
    height: 25px;
    -webkit-user-drag: none;
  }
}
:deep(.highlight-text) {
  background-color: yellow;
  border-radius: 1px;
}
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.rotating-img {
  animation: rotate 1.5s linear infinite;
}
/* 对话框展开和收起的动画 */
.dialog-expand-enter-active,
.dialog-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  transform-origin: top right;
  pointer-events: auto;
}

.dialog-expand-enter-from,
.dialog-expand-leave-to {
  opacity: 0;
  transform: scale(0.1);
}

.dialog-expand-enter-to,
.dialog-expand-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
