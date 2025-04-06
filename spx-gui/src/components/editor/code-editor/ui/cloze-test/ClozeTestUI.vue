<script setup lang="ts">
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import type { ClozeTestController } from '.'
import type { monaco } from '../../monaco'
import { onMounted, onUnmounted, watchEffect, ref } from 'vue'
const codeEditorCtx = useCodeEditorUICtx()

const props = defineProps<{
  controller: ClozeTestController
}>()

let dc: monaco.editor.IEditorDecorationsCollection | null = null
function getDecorationsCollection() {
  if (dc == null) dc = codeEditorCtx.ui.editor.createDecorationsCollection([])
  return dc
}

const styleElement = ref<HTMLStyleElement | null>(null)

onMounted(() => {
  // 创建样式元素
  styleElement.value = document.createElement('style')
  styleElement.value.textContent = `
    .code-editor .monaco-editor {
      margin: 0 !important;
    }
  `
  document.head.appendChild(styleElement.value)
})
onUnmounted(() => {
  // 移除样式元素
  if (styleElement.value) {
    document.head.removeChild(styleElement.value)
    styleElement.value = null
  }
})

// 渲染遮罩层和挖空
watchEffect((onCleanUp) => {
  const clozeAreas = props.controller.clozeAreas
  if (clozeAreas == null) return
  const clozeDecorations: monaco.editor.IModelDeltaDecoration[] = []

  const editor = codeEditorCtx.ui.editor
  const model = editor.getModel()
  if (!model) return

  const lineCount = model.getLineCount()

  // 按行处理装饰器
  for (let line = 1; line <= lineCount; line++) {
    // 检查当前行是否有 editable type
    const editableAreas = clozeAreas.filter(
      (area) => area.type === 'editable' && area.range.start.line <= line && area.range.end.line >= line
    )

    // 检查当前行是否有 editableSingleLine type
    const editableSingleLineAreas = clozeAreas.filter(
      (area) => area.type === 'editableSingleLine' && area.range.start.line <= line && area.range.end.line >= line
    )

    // 如果该行没有 editable 和 editableSingleLine，添加灰色背景并禁用鼠标交互
    if (editableAreas.length === 0 && editableSingleLineAreas.length === 0) {
      clozeDecorations.push({
        range: {
          startLineNumber: line,
          startColumn: 0,
          endLineNumber: line,
          endColumn: 0
        },
        options: {
          isWholeLine: true,
          className: 'cloze-test-block',
          linesDecorationsClassName: 'cloze-test-line-header',
          stickiness: 1
        }
      })
    }

    // 如果有 editableSingleLine 区域，添加灰色背景和挖空
    if (editableSingleLineAreas.length > 0) {
      clozeDecorations.push({
        range: {
          startLineNumber: line,
          startColumn: 0,
          endLineNumber: line,
          endColumn: 0
        },
        options: {
          isWholeLine: true,
          className: 'cloze-test-block-partial',
          linesDecorationsClassName: 'cloze-test-line-header',
          stickiness: 0
        }
      })
      for (const area of editableSingleLineAreas) {
        clozeDecorations.push({
          range: {
            startLineNumber: line,
            startColumn: area.range.start.column,
            endLineNumber: line,
            endColumn: area.range.end.column
          },
          options: {
            isWholeLine: false,
            inlineClassName: 'cloze-test-inline',
            stickiness: 0
          }
        })
      }
    }
  }

  const decorationsCollection = getDecorationsCollection()
  decorationsCollection.set(clozeDecorations)
  onCleanUp(() => decorationsCollection.clear())
})

// 添加键盘事件监听，处理填空区域的编辑限制
watchEffect((onCleanUp) => {
  const clozeAreas = props.controller.clozeAreas
  if (clozeAreas == null) return
  const editor = codeEditorCtx.ui.editor
  if (!editor) return

  const listener = editor.onKeyDown((e: monaco.IKeyboardEvent) => {
    const position = editor.getPosition()
    if (!position) return
    // 检查当前光标是否在填空区域内
    const currentArea = clozeAreas.find((area) => {
      const { start, end } = area.range
      if (area.type === 'editableSingleLine')
        return (
          position.lineNumber >= start.line &&
          position.lineNumber <= end.line &&
          position.column >= start.column &&
          position.column <= end.column
        )
      return position.lineNumber >= start.line && position.lineNumber <= end.line
    })

    if (!currentArea) return

    // 处理单行填空区域的限制
    if (currentArea.type === 'editableSingleLine') {
      const { start, end } = currentArea.range

      // 禁用空格和tab
      if (e.keyCode === 10 || e.keyCode === 2) {
        e.preventDefault()
        e.stopPropagation()
      }

      // 键入删除
      if (e.keyCode === 1) {
        e.preventDefault()
        e.stopPropagation()
        // 在开始位置时只需禁用删除，不用做其他操作
        if (!(position.lineNumber === start.line && position.column === start.column)) {
          const model = editor.getModel()
          if (model) {
            const currentChar = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: position.column - 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            })
            // 如果删除空格，仅左移光标，否则替换左边字符为空格后再左移光标
            if (currentChar !== ' ') {
              editor.executeEdits('', [
                {
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column - 1
                  },
                  text: ' '
                }
              ])
            }
            editor.setPosition({
              lineNumber: position.lineNumber,
              column: position.column - 1
            })
          }
        }
      }

      // 在结束位置时禁止输入
      if (position.lineNumber === end.line && position.column === end.column) {
        if (e.keyCode !== 15 && e.keyCode !== 1) {
          // 除了 删除 和左箭头
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }

      // 替换模式：替换当前字符而不是插入
      if ((e.keyCode >= 21 && e.keyCode <= 56) || (e.keyCode >= 85 && e.keyCode <= 95)) {
        const model = editor.getModel()
        if (model) {
          const currentChar = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column + 1
          })
          if (currentChar === ' ') {
            e.preventDefault()
            editor.executeEdits('', [
              {
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column + 1
                },
                text: e.browserEvent.key
              }
            ])
            // 右移光标
            editor.setPosition({
              lineNumber: position.lineNumber,
              column: position.column + 1
            })
          }
        }
      }
    }

    // 处理多行填空区域的限制
    if (currentArea.type === 'editable') {
      // 所有行的第一列禁止删除
      if (position.column === 1) {
        if (e.keyCode === 1) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
    }

    // 禁用换行
    if (e.keyCode === 3) {
      e.preventDefault()
    }
  })

  onCleanUp(() => listener.dispose())
})

// 添加光标位置监听，限制光标只能在填空区域内移动
watchEffect((onCleanUp) => {
  const clozeAreas = props.controller.clozeAreas
  if (clozeAreas == null) return
  const editor = codeEditorCtx.ui.editor
  if (!editor) return

  const listener = editor.onDidChangeCursorPosition(() => {
    const position = editor.getPosition()
    if (!position) return

    // 检查当前光标是否在填空区域内
    const isInClozeArea = clozeAreas.some((area) => {
      const { start, end } = area.range
      if (area.type === 'editableSingleLine')
        return (
          position.lineNumber >= start.line &&
          position.lineNumber <= end.line &&
          position.column >= start.column &&
          position.column <= end.column
        )
      return position.lineNumber >= start.line && position.lineNumber <= end.line
    })

    // 如果不在填空区域内，将光标移动到最近的填空区域
    if (!isInClozeArea) {
      // 找到最近的填空区域
      let nearestArea = null
      let minDistance = Infinity

      for (const area of clozeAreas) {
        const { start, end } = area.range
        const distance = Math.min(Math.abs(position.lineNumber - start.line), Math.abs(position.lineNumber - end.line))
        if (distance < minDistance) {
          minDistance = distance
          nearestArea = area
        }
      }

      if (nearestArea) {
        // 将光标移动到最近的填空区域的开始位置
        editor.setPosition({
          lineNumber: nearestArea.range.start.line,
          column: nearestArea.range.start.column
        })
      }
    }
  })

  onCleanUp(() => listener.dispose())
})
</script>

<template>
  <div></div>
</template>

<style lang="scss">
.cloze-test-inline {
  background-color: white !important;
  padding: 3px 0;
  border-radius: 5px;
}

.cloze-test-block {
  background-color: rgb(85 85 85 / 29%) !important;
  z-index: 1;
}
.cloze-test-block-partial {
  background-color: rgb(85 85 85 / 29%) !important;
}
.cloze-test-line-header {
  width: 100% !important;
  left: 0 !important;
  background-color: rgb(85 85 85 / 29%) !important;
}
</style>
