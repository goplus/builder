```typescript
interface ResourceFilterState {
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

interface ResourceFilter {
  // 设置某类资源的过滤状态
  setFilter(type: ResourceType, enabled: boolean, resources: string[]): void
  
  // 重置所有过滤器
  reset(): void
  
  // 获取当前过滤状态
  getState(): ResourceFilterState
}
