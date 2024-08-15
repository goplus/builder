import { Disposable } from '@/models/common/disposable'
import type { CompletionItem } from '@/components/editor/code-editor/EditorUI'

export class CompletionItemCache extends Disposable {
  private cache: CompletionItem[] = []

  constructor() {
    super()
    this.addDisposer(this.clear)
  }

  public add(item: CompletionItem[]) {
    this.cache.push(...item)
  }

  public set(item: CompletionItem[]) {
    this.cache = item
  }

  public getAll() {
    return this.cache
  }

  public clear() {
    this.cache = []
  }
}
