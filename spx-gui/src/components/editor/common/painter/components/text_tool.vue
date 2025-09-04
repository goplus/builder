<template>
  <div class="text-tool">
    <!-- 文本输入框 - 只在编辑时显示 -->
    <div
      v-for="textBox in textBoxes"
      v-show="textBox.isEditing"
      :key="textBox.id"
      :class="['text-input', { active: textBox.isEditing }]"
      :style="{
        left: textBox.x + 'px',
        top: textBox.y + 'px',
        fontSize: textBox.fontSize + 'px',
        color: textBox.color
      }"
    >
      <textarea
        ref="textareaRefs"
        v-model="textBox.text"
        :style="{
          fontSize: textBox.fontSize + 'px',
          color: textBox.color
        }"
        @blur="finishEditing(textBox)"
        @keydown="handleKeydown($event, textBox)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import paper from 'paper'

// Props
interface Props {
  canvasWidth: number
  canvasHeight: number
  isActive: boolean
}

const props = defineProps<Props>()

// 文本框接口定义
interface TextBox {
  id: string
  x: number
  y: number
  text: string
  fontSize: number
  color: string
  isEditing: boolean
  paperText?: paper.PointText
}

// 点位置接口
interface Point {
  x: number
  y: number
}

// 响应式变量
const textBoxes = ref<TextBox[]>([])
const textareaRefs = ref<HTMLTextAreaElement[]>([])

// 注入父组件接口
const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 创建文本对象
const createTextObject = (textBox: TextBox): paper.PointText => {
  const text = new paper.PointText({
    point: new paper.Point(textBox.x, textBox.y + textBox.fontSize),
    content: textBox.text,
    fontSize: textBox.fontSize,
    fillColor: new paper.Color(textBox.color),
    fontFamily: 'Arial, sans-serif'
  })

  return text
}

// 处理画布点击
const handleCanvasClick = (point: Point): void => {
  if (!props.isActive) return

  // 检查是否点击了已有的文字
  const hitResult = paper.project.hitTest(new paper.Point(point.x, point.y), {
    fill: true,
    stroke: true,
    segments: true,
    tolerance: 5
  })

  if (hitResult && hitResult.item && hitResult.item.constructor.name.includes('PointText')) {
    const paperText = hitResult.item as paper.PointText
    // 规范化字体大小为数字，避免算术运算类型错误
    const paperFontSize: number = typeof (paperText as any).fontSize === 'number' ? (paperText as any).fontSize : 16

    // 优先通过对象引用查找，如果找不到则通过内容和位置匹配
    let textBox = textBoxes.value.find((tb) => tb.paperText === paperText)

    if (!textBox && paperText.content) {
      // 通过内容和大致位置匹配
      textBox = textBoxes.value.find(
        (tb) =>
          tb.text === paperText.content &&
          Math.abs(tb.x - paperText.point.x) < 10 &&
          Math.abs(tb.y - (paperText.point.y - paperFontSize)) < 10
      )
    }

    if (textBox) {
      // 更新文本框的 paperText 引用，确保下次能直接匹配
      textBox.paperText = paperText
      startEditing(textBox)
      return
    }
  }

  // 点击了空白区域，创建新的文本框
  const newTextBox: TextBox = {
    id: `text_${Date.now()}_${Math.random()}`,
    x: point.x,
    y: point.y,
    text: '',
    fontSize: 16,
    color: '#000000',
    isEditing: true
  }

  textBoxes.value.push(newTextBox)

  // 创建 Paper.js 文本对象
  const paperText = createTextObject(newTextBox)
  newTextBox.paperText = paperText

  // 添加到路径数组
  const currentPaths = getAllPathsValue()
  currentPaths.push(paperText as any)
  setAllPathsValue(currentPaths)

  // 延迟聚焦到输入框，避免冲突
  setTimeout(() => {
    const textarea = textareaRefs.value[textareaRefs.value.length - 1]
    if (textarea && document.activeElement !== textarea) {
      textarea.focus()
      textarea.select()
    }
  }, 10)
}

// 开始编辑文本
const startEditing = (textBox: TextBox): void => {
  if (!props.isActive) return

  textBox.isEditing = true

  // 隐藏 paper 文本对象
  if (textBox.paperText) {
    textBox.paperText.visible = false
    paper.view.update()
  }

  // 延迟聚焦到输入框，避免冲突
  setTimeout(() => {
    const textBoxIndex = textBoxes.value.findIndex((tb) => tb.id === textBox.id)
    const textarea = textareaRefs.value[textBoxIndex]
    if (textarea && document.activeElement !== textarea) {
      textarea.focus()
      textarea.select()
    }
  }, 10)
}

// 完成编辑
const finishEditing = (textBox: TextBox): void => {
  if (!textBox.isEditing) return // 避免重复处理

  textBox.isEditing = false

  // 如果文本为空，删除该文本框
  if (!textBox.text.trim()) {
    removeTextBox(textBox)
    return
  }

  // 更新 paper 文本对象
  if (textBox.paperText) {
    textBox.paperText.content = textBox.text
    textBox.paperText.visible = true
    paper.view.update()
  }

  // 导出 SVG，使用延迟避免与焦点切换冲突
  setTimeout(() => {
    exportSvgAndEmit()
  }, 50)
}

// 删除文本框
const removeTextBox = (textBox: TextBox): void => {
  // 从文本框数组中移除
  const index = textBoxes.value.findIndex((t) => t.id === textBox.id)
  if (index > -1) {
    textBoxes.value.splice(index, 1)
  }

  // 从 paper 项目中移除
  if (textBox.paperText) {
    textBox.paperText.remove()
  }

  // 从路径数组中移除
  const currentPaths = getAllPathsValue()
  const pathIndex = currentPaths.findIndex((p) => p === (textBox.paperText as any))
  if (pathIndex > -1) {
    currentPaths.splice(pathIndex, 1)
    setAllPathsValue(currentPaths)
  }

  paper.view.update()
  exportSvgAndEmit()
}

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent, textBox: TextBox): void => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    finishEditing(textBox)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    // 取消编辑，恢复原文本
    finishEditing(textBox)
  }
}

// 清理所有文本框
const clearAllTextBoxes = (): void => {
  textBoxes.value.forEach((textBox) => {
    if (textBox.paperText) {
      textBox.paperText.remove()
    }
  })
  textBoxes.value = []
  paper.view.update()
}

// 暴露方法给父组件
defineExpose({
  handleCanvasClick,
  clearAllTextBoxes
})
</script>

<style scoped>
.text-tool {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}

.text-input {
  position: absolute;
  pointer-events: auto;
  cursor: text;
  min-width: 20px;
  min-height: 20px;
}

.text-input textarea {
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-family: Arial, sans-serif;
  padding: 2px;
  margin: 0;
  line-height: 1.2;
  min-width: 100px;
  min-height: 20px;
  overflow: hidden;
}

.text-input.active {
  background: rgba(33, 150, 243, 0.1);
  border: 1px dashed #2196f3;
  border-radius: 2px;
}
</style>
