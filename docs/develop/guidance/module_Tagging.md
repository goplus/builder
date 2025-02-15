```typescript
/** Tag 类 */
export class Tagging {
  /** key 和 element 的映射 */
  private tags: Map<string, HTMLElement>;

  /** 添加一个标注  */
  addTag(key: string, element: HTMLElement): void;

  /** 移除标注 */
  removeTag(key: string): void;

  /** 获取所有标注 */
  getAllTags(): TagInfo[];

  /** 通过查找路径keys获取目标组件 */
  getElementByKeys(keys: string[]): HTMLElement | null;

  /** 清空所有标注 */
  clearAllTags(): void;
}
```
