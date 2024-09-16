import { Disposable } from '@/utils/disposable'
import type { CompletionItem } from '@/components/editor/code-editor/EditorUI'

export interface CompletionItemCachePosition {
  id: string
  lineNumber: number
  column: number
}

export class CompletionItemCache extends Disposable {
  public cache: CompletionItem[] | null = null
  private position: CompletionItemCachePosition = {
    id: '',
    lineNumber: -1,
    column: -1
  }

  constructor() {
    super()
    // do not use `this.addDisposer(this.clear)` this will change `this` point to class `Disposable` instead of `CompletionItemCache`
    // will throw undefined error.
    this.addDisposer(() => {
      this.clear()
      this.position = {
        id: '',
        lineNumber: -1,
        column: -1
      }
    })
  }

  public set(position: CompletionItemCachePosition, items: CompletionItem[]) {
    this.position = { ...position }
    this.cache = items
  }

  public clear() {
    this.cache = []
  }

  public get(completionItemCacheID: CompletionItemCachePosition) {
    if (this.isSamePosition(completionItemCacheID)) {
      return this.cache
    } else {
      return null
    }
  }

  public isSamePosition(position: CompletionItemCachePosition) {
    return (
      this.position.id === position.id &&
      this.position.lineNumber === position.lineNumber &&
      this.position.column === position.column
    )
  }
}
