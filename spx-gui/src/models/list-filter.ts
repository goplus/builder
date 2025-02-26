import { defineStore } from 'pinia'

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

/**
 * The useListFilterStore is a Pinia store used to manage the state of various filters
 * for different types of lists such as apiReference, asset, sprite, sound, etc.
 * It allows setting, getting, and resetting filters.
 */
export const useListFilterStore = defineStore('list-filter', {
  state: (): ListFilterState => {
    return {
      apiReference: createDefaultFilter(),
      asset: createDefaultFilter(),
      sprite: createDefaultFilter(),
      sound: createDefaultFilter(),
      costume: createDefaultFilter(),
      animation: createDefaultFilter(),
      widget: createDefaultFilter(),
      backdrop: createDefaultFilter()
    }
  },

  actions: {
    setFilter(type: ListFilterType, enabled: boolean, items: string[]): void {
      if (!Object.prototype.hasOwnProperty.call(this, type)) {
        throw new Error(`Invalid filter type: ${type}`)
      }

      this[type] = {
        enabled,
        items: [...items]
      }
    },

    getFilter(type: ListFilterType): { enabled: boolean; items: string[] } {
      if (!Object.prototype.hasOwnProperty.call(this, type)) {
        throw new Error(`Invalid filter type: ${type}`)
      }

      return {
        enabled: this[type].enabled,
        items: [...this[type].items]
      }
    },

    reset() {
      this.$patch({
        apiReference: createDefaultFilter(),
        asset: createDefaultFilter(),
        sprite: createDefaultFilter(),
        sound: createDefaultFilter(),
        costume: createDefaultFilter(),
        animation: createDefaultFilter(),
        widget: createDefaultFilter(),
        backdrop: createDefaultFilter()
      })
    }
  }
})
