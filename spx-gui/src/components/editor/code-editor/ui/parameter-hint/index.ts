import { debounce } from 'lodash'
import { watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type { Range } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'
import type { TextDocument } from '../../text-document'

export type ParameterHintItem = {
  name: string
  range: Range
}

export class ParameterHintController extends Disposable {
  constructor(private ui: CodeEditorUI) {
    super()
  }

  private getItemsForFunc(name: string, args: string[], textDocument: TextDocument): ParameterHintItem[] {
    const content = textDocument.getValue()
    const items: ParameterHintItem[] = []
    let index = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const funcIndex = content.indexOf(name, index)
      if (funcIndex === -1) break
      let offset = funcIndex + name.length + 1
      for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        const startAt = offset
        let endAt = offset + 1
        while (content[endAt] !== ',' && content[endAt] !== '\n' && content[endAt] !== '{' && content[endAt] != null) {
          endAt++
        }
        items.push({
          name: arg,
          range: {
            start: textDocument.getPositionAt(startAt),
            end: textDocument.getPositionAt(endAt)
          }
        })
        offset = endAt
        while (content[offset] === ' ' || content[offset] === ',') {
          offset++
        }
      }
      index = funcIndex + name.length
    }
    return items
  }

  private getItems(textDocument: TextDocument) {
    return (window as any).paramItems = [
      ...this.getItemsForFunc('say', ['message'], textDocument),
      ...this.getItemsForFunc('setHeading', ['direction'], textDocument),
      ...this.getItemsForFunc('nextBackdrop', ['wait'], textDocument),
      ...this.getItemsForFunc('glide', ['x', 'y', 'seconds'], textDocument),
      ...this.getItemsForFunc('if', ['condition', 'then'], textDocument),
      ...this.getItemsForFunc('println', ['msg'], textDocument),
      ...this.getItemsForFunc('setCostume', ['name'], textDocument)
    ]
  }

  private mgr = new TaskManager(async () => {
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) throw new Error('No active text document')
    return this.getItems(textDocument)
  })

  get items() {
    return this.mgr.result.data
  }

  init() {
    const refresh = debounce(() => this.mgr.start(), 100)

    this.addDisposer(
      watch(
        () => [this.ui.project.filesHash, this.ui.activeTextDocument],
        () => refresh(),
        { immediate: true }
      )
    )
  }
}
