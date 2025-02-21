```typescript
type ListFilterType = 'apiReference' | 'asset' | 'sprite' | 'animation'

type ListFilterState {
  apiReference: {
    enabled: boolean       // 是否启用API Reference过滤
    items: string[]    // 需要显示的API Reference的definition列表
  }
  asset: {
    enabled: boolean      // 是否启用素材过滤
    items: string[]   // 需要显示的素材的id列表 
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

export class ListFilter {
  constructor(initialState?: Partial<ListFilterState>)

  setFilter(type: ListFilterType, enabled: boolean, items: string[]): void

  getFilter(type: ListFilterType): { enabled: boolean, items: string[] }

  reset(): void
}
```
