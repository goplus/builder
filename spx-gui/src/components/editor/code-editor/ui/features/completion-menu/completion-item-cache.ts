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
    if (!this.isSamePositionAndStorePosition(position)) this.clear()
    return this.cache.length > 0
  }

  public add(position: CompletionItemCachePosition, item: CompletionItem[]) {
    if (!this.isSamePositionAndStorePosition(position)) this.clear()
    this.cacheLeftTime++
    this.cache.push(...item)
  }

  public getAll(position: CompletionItemCachePosition) {
    if (this.cacheLeftTime <= 0) return []
    if (!this.isSamePositionAndStorePosition(position)) this.clear()
    this.cacheLeftTime--
    const result = this.cache
    if (this.cacheLeftTime <= 0) this.cache = []
    return result
  }

  // consider using decoration syntax? current ts config is not allowed.
  isSamePositionAndStorePosition(position: CompletionItemCachePosition) {
    const isSamePosition =
      this.position.id === position.id &&
      this.position.lineNumber === position.lineNumber &&
      this.position.column === position.column
    // deep clone.
    if (!isSamePosition) {
      this.position.column = position.column
      this.position.lineNumber = position.lineNumber
      this.position.id = position.id
      this.cacheLeftTime = 0
    }
    return isSamePosition
  }

  public clear() {
    this.cache = []
  }
}

export class CompletionItemCodePreviewCache extends Disposable {
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
    if (!this.isSamePositionAndStorePosition(position)) this.clear()
    return this.cache.length > 0
  }

  public add(position: CompletionItemCachePosition, item: CompletionItem[]) {
    if (!this.isSamePositionAndStorePosition(position)) this.clear()
    this.cache.push(...item)
  }

  public getAll(position: CompletionItemCachePosition) {
    if (this.cacheLeftTime <= 0) return []
    if (!this.isSamePositionAndStorePosition(position)) this.clear()
    const result = this.cache
    return result
  }

  // consider using decoration syntax? current ts config is not allowed.
  isSamePositionAndStorePosition(position: CompletionItemCachePosition) {
    const isSamePosition =
      this.position.id === position.id &&
      this.position.lineNumber === position.lineNumber &&
      this.position.column === position.column
    // deep clone.
    if (!isSamePosition) {
      this.position.column = position.column
      this.position.lineNumber = position.lineNumber
      this.position.id = position.id
      this.cacheLeftTime = 0
    }
    return isSamePosition
  }

  public clear() {
    this.cache = []
  }
}
