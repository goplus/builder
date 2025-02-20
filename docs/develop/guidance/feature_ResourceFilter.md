```typescript
import { useResourceFilterStore } from '@/stores/resource-filter'

class APIReferenceProvider implements IAPIReferenceProvider {
  private resourceFilter = useResourceFilterStore()
·
  // ...existing code...

  async provideAPIReference(ctx: APIReferenceContext, position: Position | null) {
      const apiReferenceItems = await this.getFallbackItems(ctx)
      
      // 从 ResourceFilterState 中获取API过滤状态
      const { enabled, items } = this.resourceFilter.getFilter('api')
      
      // 未启用过滤或列表为空时返回全部
      if (!enabled || items.length === 0) {
        return apiReferenceItems
      }

      // 使用 items 列表进行过滤
      return apiReferenceItems.filter(item => {
        const apiName = item.definition.name?.split('.')[1] || ''
        return items.includes(apiName)
      })
  }
}
```

---

```typescript
import { useResourceFilterStore } from '@/stores/resource-filter'

const resourceFilter = useResourceFilterStore()

const props = defineProps<{
  step: Step
}>()

onMounted(() => {
  if (props.step.isApiControl) {
    resourceFilter.setFilter('api', true, props.step.apis)
  }
  if (props.step.isSpriteControl) {
    resourceFilter.setFilter('sprite', true, props.step.sprites)
  }
})

onBeforeUnmount(() => {
  resourceFilter.reset()
})
```
