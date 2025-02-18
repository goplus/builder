```typescript
import { useResourceFilterStore } from '@/stores/resource-filter'

class APIReferenceProvider implements IAPIReferenceProvider {
    private resourceFilter = useResourceFilterStore()

    // ...existing code...

    async provideAPIReference(ctx: APIReferenceContext, position: Position | null) {
        const apiReferenceItems = await this.getFallbackItems(ctx)
        
        // 从 ResourceFilterState 中获取资源过滤状态
        const { api: { enabled, resources } } = this.resourceFilter.getState()
        
        // 未启用过滤或资源列表为空时返回全部
        if (!enabled || resources.length === 0) {
            return apiReferenceItems
        }

        // 使用 resources 列表进行过滤
        return apiReferenceItems.filter(item => {
            const apiName = item.definition.name?.split('.')[1] || ''
            return resources.includes(apiName)
        })
    }
}
```

---

```typescript
import { useResourceFilterStore } from '@/stores/resource-filter'

class StepPlayer implements IStepPlayer {
    private resourceFilter = useResourceFilterStore()

    function applyResourceFilter() {
        if(this.step.resources) {
            this.resourceFilter.setFilter('api', true, this.step.resources.api)
            this.resourceFilter.setFilter('sprite', true, this.step.resources.sprite)
        }
    }

    function destroy() {
        this.resourceFilter.reset()
    }
}
```
