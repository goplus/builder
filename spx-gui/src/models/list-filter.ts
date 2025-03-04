import type { DefinitionIdentifier } from '@/components/editor/code-editor/common'
import { reactive } from 'vue'

export type ListFilterType =
  | 'apiReference'
  | 'asset'
  | 'sprite'
  | 'sound'
  | 'costume'
  | 'animation'
  | 'widget'
  | 'backdrop'

export type ListFilterState = {
  apiReference: {
    enabled: boolean
    items: DefinitionIdentifier[]
  }
  asset: {
    enabled: boolean
    items: string[]
  }
  sprite: {
    enabled: boolean
    items: string[]
  }
  sound: {
    enabled: boolean
    items: string[]
  }
  costume: {
    enabled: boolean
    items: string[]
  }
  animation: {
    enabled: boolean
    items: string[]
  }
  widget: {
    enabled: boolean
    items: string[]
  }
  backdrop: {
    enabled: boolean
    items: string[]
  }
}

function createDefaultFilter(): { enabled: boolean; items: string[] } {
  return { enabled: false, items: [] }
}

function createApiReferenceFilter(): { enabled: boolean; items: DefinitionIdentifier[] } {
  return { enabled: false, items: [] }
}

export class ListFilter {
  private state: ListFilterState

  constructor() {
    this.state = {
      apiReference: createApiReferenceFilter(),
      asset: createDefaultFilter(),
      sprite: createDefaultFilter(),
      sound: createDefaultFilter(),
      costume: createDefaultFilter(),
      animation: createDefaultFilter(),
      widget: createDefaultFilter(),
      backdrop: createDefaultFilter()
    }

    return reactive(this) as this
  }

  setFilter(type: ListFilterType, enabled: boolean, items: string[] | DefinitionIdentifier[]) {
    this.state[type].enabled = enabled
    this.state[type].items = items
  }

  getFilter(type: ListFilterType) {
    return this.state[type]
  }

  reset() {
    this.state = {
      apiReference: createApiReferenceFilter(),
      asset: createDefaultFilter(),
      sprite: createDefaultFilter(),
      sound: createDefaultFilter(),
      costume: createDefaultFilter(),
      animation: createDefaultFilter(),
      widget: createDefaultFilter(),
      backdrop: createDefaultFilter()
    }
  }
}
