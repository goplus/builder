```typescript
type ListFilterType = 'apiReference' | 'asset' | 'sprite' | 'sound' | 'costume' | 'animation' | 'widget' | 'backdrop'

type ListFilterState = {
  apiReference: {
    enabled: boolean    // 启用/禁用 API Reference 过滤器
    items: string[]    // 要显示的DefinitionIdString类型的definition的列表
  }
  asset: {
    enabled: boolean    // 启用/禁用素材过滤器
    items: string[]    // 要显示的资源displayName列表
  }
  sprite: {
    enabled: boolean    // 启用/禁用精灵过滤器
    items: string[]    // 要显示的精灵name列表
  }
  sound: {
    enabled: boolean    // 启用/禁用声音过滤器
    items: string[]    // 要显示的声音name列表
  }
  costume: {
    enabled: boolean    // 启用/禁用造型过滤器
    items: string[]    // 要显示的造型name列表
  }
  animation: {
    enabled: boolean    // 启用/禁用动画过滤器
    items: string[]    // 要显示的动画name列表
  }
  widget: {
    enabled: boolean    // 启用/禁用组件过滤器
    items: string[]    // 要显示的组件name列表
  }
  backdrop: {
    enabled: boolean    // 启用/禁用背景过滤器
    items: string[]    // 要显示的背景name列表
  }
}

export class ListFilter {
  constructor(initialState?: Partial<ListFilterState>)

  setFilter(type: ListFilterType, enabled: boolean, items: string[]): void

  getFilter(type: ListFilterType): { enabled: boolean, items: string[] }

  reset(): void
}
```
