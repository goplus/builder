import { reactive, shallowReactive } from 'vue'
import type { LocaleMessage } from '@/utils/i18n'
import type { Files } from '../common/file'
import type { Project } from '.'

export type Action = {
  name: LocaleMessage
}

export type State = {
  /** Files contained by the state */
  files: Files
  /** The action whcih results in the state */
  action: Action | null
}

export class History {

  constructor(private project: Project) {
    return reactive(this) as this
  }

  private states: State[] = shallowReactive([])
  /**
   * Index of current state
   * TODO: max length
   */
  private index = 0
  /** The action whcih results in current state */
  private action: Action | null = null

  private saveState() {
    this.states[this.index] = {
      files: this.project.exportFiles(),
      action: this.action
    }
  }

  private async goto(index: number) {
    if (index < 0 || index >= this.states.length) throw new Error(`invalid index ${index}`)
    this.saveState()
    const { action, files } = this.states[index]
    this.index = index
    this.action = action
    console.log('goto', this.states.map(s => s.action), this.index)
    await this.project.load(null, files)
  }

  getRedoAction() {
    return this.states[this.index + 1]?.action ?? null
  }

  async redo() {
    await this.goto(this.index + 1)
  }

  getUndoAction() {
    if (this.index === 0) return null
    return this.action
  }

  // TODO: relation with Project `hasUnsyncedChanges`
  async undo() {
    await this.goto(this.index - 1)
  }

  async doAction<T>(name: LocaleMessage, fn: () => T | Promise<T>): Promise<T> {
    this.states = this.states.slice(0, this.index + 1)
    this.saveState()
    this.index++
    // TODO: mutex
    this.action = { name }
    console.log('doAction', this.states.map(s => s.action), this.index)
    return fn()
  }
}