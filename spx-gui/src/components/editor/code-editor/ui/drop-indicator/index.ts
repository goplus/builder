/**
 * @file Drop Indicator Controller
 * @desc Manages drop positions and visual indicators for drag and drop operations in Monaco editor
 */

import { throttle } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { type Position } from '../../common'
import { toMonacoPosition } from '../common'
import type { CodeEditorUI } from '../code-editor-ui'

export class DropIndicatorController extends Disposable {
  constructor(private ui: CodeEditorUI) {
    super()
  }

  private dropPositionRef = shallowRef<Position | null>(null)

  get dropPosition() {
    return this.dropPositionRef.value
  }

  setDropPosition(position: Position | null) {
    this.dropPositionRef.value = position
  }

  init() {
    // Watch for changes in drop position and scroll the editor correspondingly.
    this.addDisposer(
      watch(
        () => this.dropPosition,
        // Use `throttle` to control the scroll speed.
        throttle((dropPosition: Position | null) => {
          if (dropPosition == null) return
          const position = toMonacoPosition(dropPosition)
          const verticalPadding = 5
          const horizontalPadding = 5
          const { editor, monaco } = this.ui
          // First we adjust vertical scroll position, then we adjust horizontal scroll position.
          editor.revealRange(
            {
              startLineNumber: Math.max(position.lineNumber - verticalPadding, 1),
              startColumn: position.column,
              endLineNumber: position.lineNumber + verticalPadding,
              endColumn: position.column
            },
            monaco.editor.ScrollType.Smooth
          )
          editor.revealRange(
            {
              startLineNumber: position.lineNumber,
              startColumn: Math.max(position.column - horizontalPadding, 1),
              endLineNumber: position.lineNumber,
              endColumn: position.column + horizontalPadding
            },
            monaco.editor.ScrollType.Smooth
          )
        }, 100)
      )
    )
  }
}
