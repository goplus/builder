```typescript
class APIReferenceProvider implements IAPIReferenceProvider {
  private filter: ListFilter

  // ...existing code...

  async provideAPIReference(ctx: APIReferenceContext, position: Position | null) {
      const apiReferenceItems = await this.getFallbackItems(ctx)
          
      // 从 ResourceFilterState 中获取API过滤状态
      const { enabled, items } = this.filter.getFilter('apiReference')
          
      // 未启用过滤或列表为空时返回全部
      if (!enabled || items.length === 0) {
        return apiReferenceItems
      }

      // 使用 items 列表进行过滤
      return apiReferenceItems.filter(item => {
        return items.includes(item.definition)
      })
  }
}
```

```typescript
const filter: ListFilter

const props = defineProps<{
  step: Step
}>()

onMounted(() => {
  if (props.step.isApiControl) {
    resourceFilter.setFilter('apiReference', true, props.step.apis)
  }
  if (props.step.isSpriteControl) {
    resourceFilter.setFilter('sprite', true, props.step.sprites)
  }
})

onBeforeUnmount(() => {
  resourceFilter.reset()
})
```
