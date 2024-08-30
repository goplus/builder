import { Disposable } from '@/utils/disposable'
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
  private cacheLeftTime = 0

  constructor() {
    super()
    // do not use `this.addDisposer(this.clear)` this will change `this` point to class `Disposable` instead of `CompletionItemCache`
    // will throw undefined error.
    this.addDisposer(() => this.clear())
  }

  isCacheAvailable(position: CompletionItemCachePosition) {
    if (!this.isSamePositionOtherwiseStorePosition(position)) this.clear()
    return this.cacheLeftTime > 0
  }

  public add(position: CompletionItemCachePosition, items: CompletionItem[]) {
    if (!this.isSamePositionOtherwiseStorePosition(position)) this.clear()
    this.cacheLeftTime++
    items.forEach((item) => {
      if (!this.has(item)) this.cache.push(item)
    })
  }

  // todo: a temporary solution, figure out what is the completion menu item id
  // a temporary solution, not addressing the root of the problem
  // this can avoid duplicate items in completion menu.
  public has(item: CompletionItem) {
    return this.cache.some(
      (cacheItem) => cacheItem.label === item.label && cacheItem.insertText === item.insertText
    )
  }

  // todo: a temporary solution, figure out what is the completion menu item id
  // this can get the item from cache to render preview component.
  public getOneByCompletionItemProps(item: Pick<CompletionItem, 'insertText' | 'label'>) {
    return this.cache.find(
      (cacheItem) => cacheItem.label === item.label && cacheItem.insertText === item.insertText
    )
  }

  public getAll(position: CompletionItemCachePosition) {
    if (this.cacheLeftTime <= 0) return []
    if (!this.isSamePositionOtherwiseStorePosition(position)) this.clear()
    this.cacheLeftTime--
    return this.cache
  }

  // consider using decoration syntax? current ts config is not allowed.
  isSamePositionOtherwiseStorePosition(position: CompletionItemCachePosition) {
    const isSamePosition = this.isSamePosition(position)
    // deep clone.
    if (!isSamePosition) {
      this.position = { ...position }
      this.cacheLeftTime = 0
    }
    return isSamePosition
  }

  public isSamePosition(position: CompletionItemCachePosition) {
    return (
      this.position.id === position.id &&
      this.position.lineNumber === position.lineNumber &&
      this.position.column === position.column
    )
  }

  public clear() {
    this.cache = []
  }
}
