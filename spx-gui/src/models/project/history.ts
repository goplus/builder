/**
 * @file class History
 * @desc Manage history of files (game content) change of project
 */

import { shallowReactive } from 'vue'
import type { LocaleMessage } from '@/utils/i18n'
import Mutex from '@/utils/mutex'
import type { Files } from '../common/file'
import type { Project } from '.'

export type Action = {
  /** Name of the action, will be displayed to the user */
  name: LocaleMessage
  /**
   * If the action is mergeable.
   * Adjacent **same** (reference-equal) mergeable actions will be merged into one history item.
   */
  mergeable?: boolean
}

export type State = {
  /** Files contained by the state */
  files: Files
  /** The action which results in the state */
  action: Action | null
}

export class History {
  private mutex = new Mutex()

  constructor(
    private project: Project,
    /**
     * Max history item num.
     * When exceeded, the old history(s) will be discarded.
     */
    private maxLength = 100
  ) {
    return shallowReactive(this) as this
  }

  /** The states array records state for all the history items */
  private states: State[] = shallowReactive([])
  /**
   * Index of current state (in states array).
   * If current state not saved to states yet, `index` indicates the next index to save.
   */
  private index = 0
  /** The action which results in current state */
  private action: Action | null = null

  private saveCurrentState() {
    this.states[this.index] = {
      files: this.project.exportGameFiles(),
      action: this.action
    }
  }

  private async goto(index: number) {
    if (index < 0 || index >= this.states.length) throw new Error(`invalid index ${index}`)
    this.saveCurrentState()
    const { action, files } = this.states[index]
    this.index = index
    this.action = action
    await this.project.loadGameFiles(files)
  }

  getRedoAction() {
    return this.states[this.index + 1]?.action ?? null
  }

  redo() {
    return this.mutex.runExclusive(() => this.goto(this.index + 1))
  }

  getUndoAction() {
    if (this.index === 0) return null
    return this.action
  }

  undo() {
    return this.mutex.runExclusive(() => this.goto(this.index - 1))
  }

  doAction<T>(action: Action, fn: () => T | Promise<T>): Promise<T> {
    return this.mutex.runExclusive(async () => {
      // history after current state (for redo) will be discarded on any action
      this.states.splice(this.index)

      // nothing to do for history, when we merge coming action with current action
      if (this.action === action && action.mergeable) return fn()

      this.saveCurrentState()
      this.action = action
      // update & check index with max length
      this.index++
      if (this.index > this.maxLength) {
        this.states.splice(0, this.index - this.maxLength)
        this.index = this.maxLength
      }

      return fn()
    })
  }
}
