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
    items: string[]
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

export class ListFilter {
  private state: ListFilterState

  constructor() {
    this.state = {
      apiReference: createDefaultFilter(),
      asset: createDefaultFilter(),
      sprite: createDefaultFilter(),
      sound: createDefaultFilter(),
      costume: createDefaultFilter(),
      animation: createDefaultFilter(),
      widget: createDefaultFilter(),
      backdrop: createDefaultFilter()
    }
  }

  setFilter(type: ListFilterType, enabled: boolean, items: string[]) {
    this.state[type].enabled = enabled
    this.state[type].items = items
  }

  getFilter(type: ListFilterType) {
    return this.state[type]
  }

  reset() {
    this.state = {
      apiReference: createDefaultFilter(),
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
