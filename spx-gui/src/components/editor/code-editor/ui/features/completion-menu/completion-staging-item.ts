import { Disposable } from '@/utils/disposable'
import type { CompletionItem } from '@/components/editor/code-editor/EditorUI'

export interface CompletionStagingItemID {
  id: string
  lineNumber: number
  column: number
}

export class CompletionStagingItem extends Disposable {
  private stagingItems: CompletionItem[] | null = null
  private stagingItemID: CompletionStagingItemID = {
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
      this.stagingItemID = {
        id: '',
        lineNumber: -1,
        column: -1
      }
    })
  }

  public set(stagingItemID: CompletionStagingItemID, items: CompletionItem[]) {
    this.stagingItemID = { ...stagingItemID }
    this.stagingItems = items
  }

  public updateCacheID(stagingItemID: CompletionStagingItemID) {
    this.stagingItemID = { ...stagingItemID }
  }

  public clear() {
    this.stagingItems = []
  }

  public get(stagingItemID: CompletionStagingItemID) {
    if (this.isSameStagingID(stagingItemID)) {
      return this.stagingItems
    } else {
      return null
    }
  }

  public getCompletionCacheItemByIdx(idx: number): CompletionItem | undefined {
    if (this.stagingItems == null) return
    return this.stagingItems[idx]
  }

  public isSameStagingID(stagingItemID: CompletionStagingItemID) {
    return (
      this.stagingItemID.id === stagingItemID.id &&
      this.stagingItemID.lineNumber === stagingItemID.lineNumber &&
      this.stagingItemID.column === stagingItemID.column
    )
  }
}
