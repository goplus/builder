```typescript
type ResourceType = 'api' | 'asset' | 'sprite' | 'animation'

type ResourceFilterState {
  api: {
    enabled: boolean       // 是否启用API过滤
    resources: string[]    // 需要显示的API名称列表
  }
  asset: {
    enabled: boolean      // 是否启用素材过滤
    resources: string[]   // 需要显示的素材名称列表 
  }
  sprite: {
    enabled: boolean     // 是否启用精灵过滤
    resources: string[]  // 需要显示的精灵名称列表
  }
  animation: {
    enabled: boolean    // 是否启用动画过滤
    resources: string[] // 需要显示的动画名称列表
  }
}

type Events = {
  filterChanged: [type: ResourceType, enabled: boolean, resources: string[]]  // 过滤器变更事件
  filterReset: []      // 过滤器重置事件
}

type Expose {
  setFilter(type: ResourceType, enabled: boolean, resources: string[]): void
  reset(): void
  getState(): ResourceFilterState
}
