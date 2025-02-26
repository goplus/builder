```typescript
type ListFilterType = 'apiReference' | 'asset' | 'sprite' | 'sound' | 'costume' | 'animation' | 'widget' | 'backdrop'

type ListFilterState = {
  apiReference: {
    enabled: boolean    // 启用/禁用 API Reference 过滤器
    items: string[]    // 要显示的definition列表
  }
  asset: {
    enabled: boolean    // 启用/禁用素材过滤器
    items: string[]    // 要显示的资源id列表
  }
  sprite: {
    enabled: boolean    // 启用/禁用精灵过滤器
    items: string[]    // 要显示的精灵id列表
  }
  sound: {
    enabled: boolean    // 启用/禁用声音过滤器
    items: string[]    // 要显示的声音id列表
  }
  costume: {
    enabled: boolean    // 启用/禁用造型过滤器
    items: string[]    // 要显示的造型id列表
  }
  animation: {
    enabled: boolean    // 启用/禁用动画过滤器
    items: string[]    // 要显示的动画id列表
  }
  widget: {
    enabled: boolean    // 启用/禁用组件过滤器
    items: string[]    // 要显示的组件id列表
  }
  backdrop: {
    enabled: boolean    // 启用/禁用背景过滤器
    items: string[]    // 要显示的背景id列表
  }
}

export class ListFilter {
  constructor(initialState?: Partial<ListFilterState>)

  setFilter(type: ListFilterType, enabled: boolean, items: string[]): void

  getFilter(type: ListFilterType): { enabled: boolean, items: string[] }

  reset(): void
}
```
