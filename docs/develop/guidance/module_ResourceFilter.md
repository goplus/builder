```typescript
type ListFilterType = 'api' | 'asset' | 'sprite' | 'animation'

// 保持现有的 ListFilterState 不变
type ListFilterState {
  api: {
    enabled: boolean       // 是否启用API过滤
    items: string[]    // 需要显示的API的definition.name列表
  }
  asset: {
    enabled: boolean      // 是否启用素材过滤
    items: string[]   // 需要显示的素材的displayName列表 
  }
  sprite: {
    enabled: boolean     // 是否启用精灵过滤
    items: string[]  // 需要显示精灵的name列表
  }
  animation: {
    enabled: boolean    // 是否启用动画过滤
    items: string[] // 需要显示的动画的name列表
  }
}

export class ListFilter extends Emitter<{
  didChangeFilter: { type: ListFilterType }
}> {
  readonly state: ListFilterState

  constructor(initialState?: Partial<ListFilterState>) {
    super()
    this.state = {
      api: { enabled: false, items: [] },
      asset: { enabled: false, items: [] },
      sprite: { enabled: false, items: [] },
      animation: { enabled: false, items: [] },
      ...initialState
    }
  }

  setFilter(type: ListFilterType, enabled: boolean, items: string[]) {
    this.state[type] = { enabled, items }
    this.emit('didChangeFilter', { type })
  }

  getFilter(type: ListFilterType) {
    return { ...this.state[type] }
  }

  reset() {
    Object.keys(this.state).forEach(type => {
      this.state[type as ListFilterType] = { enabled: false, items: [] }
    })
  }
}
```
