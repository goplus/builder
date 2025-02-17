```typescript
/** 节点  */
export interface TagNode {
  e: Component;
  children?: Record<string, TagNode>;
}

/** Tag 类 */
export class Tagging {
  /**  */
  private tagTree: Record<string, TagNode>;

  contrustor() {
    /* 遍历组件树，收集tag，初始化tagTree */
  }

  /** 添加一个标注
   * @param key: 添加组件的key值
   * @param component: 被添加的组件
   * @param keys: 添加到的目标节点，不传时添加到根节点
   */
  addTag(key: string, component: Component, keys?: string[]): void;

  /** 移除标注
   * @param keys: 要移除的目标节点
   */
  removeTag(keys: string[]): void;

  /** 通过查找路径keys获取目标组件 */
  getElementByKeys(keys: string[]): Component | null;

  /** 清空所有标注 */
  clearAllTags(): void;
}
```
