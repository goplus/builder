import { Disposable } from '@/models/common/disposable'
import type { CompletionItem } from '@/components/editor/code-editor/EditorUI'

export interface CompletionItemCachePosition {
  id: string
  lineNumber: number
  column: number
}

export class CompletionItemCache extends Disposable {
  private cache: CompletionItem[] = []
  private position: CompletionItemCachePosition = {
    id: '',
    lineNumber: -1,
    column: -1
  }

  constructor() {
    super()
    this.addDisposer(() => this.clear())
  }

  public add(position: CompletionItemCachePosition, item: CompletionItem[]) {
    if (!this.isSamePositionAndStorePosition(position)) this.clear()
    this.cache.push(...item)
  }

  public set(position: CompletionItemCachePosition, item: CompletionItem[]) {
    if (!this.isSamePositionAndStorePosition(position)) this.clear()
    this.cache = item
  }

  public getAll(position: CompletionItemCachePosition) {
    if (!this.isSamePositionAndStorePosition(position)) this.clear()
    return this.cache
  }

  isSamePositionAndStorePosition(position: CompletionItemCachePosition) {
    const isSamePosition =
      this.position.id === position.id &&
      this.position.lineNumber === position.lineNumber &&
      this.position.column === position.column
    // sample object assignment to avoid potential pointer reference problem, instead of use `this.position = position`
    // deep clone.
    if (!isSamePosition) {
      this.position.column = position.column
      this.position.lineNumber = position.lineNumber
      this.position.id = position.id
    }
    return isSamePosition
  }

  public clear() {
    this.cache.length = 0
  }
}
