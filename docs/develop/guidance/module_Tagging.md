```typescript
/** Tag 类 */
export class TagManage {
  /** 添加一个标注  */
  function addTag(key: string, element: HTMLElement): void

  /** 移除标注 */
  function removeTag(key: string): void

  /** 获取所有标注 */
  function getAllTags(): TagInfo[]

  /** 按 key 获取标注 */
  function getTagByKey(key: string): TagInfo | undefined

  /** 清空所有标注 */
  function clearAllTags(): void
}

/** 消费工具 */
export function useTagManager(): TagManager
```
