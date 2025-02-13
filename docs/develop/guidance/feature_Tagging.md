# TagManager

```typescript
import { ref, type Ref } from "vue";

export type TagInfo = {
  key: string;
  element: HTMLElement;
};

export class TagManager {
  private tagsMap: Ref<Map<string, HTMLElement>> = ref(new Map());

  /**
   * 添加标注
   */
  addTag(key: string, element: HTMLElement) {
    if (this.tagsMap.value.has(key)) {
      console.warn(`Tag ${key} already exists`);
      return;
    }
    this.tagsMap.value.set(key, element);
  }

  /**
   * 移除标注
   */
  removeTag(key: string) {
    this.tagsMap.value.delete(key);
  }

  /**
   * 获取所有标注
   */
  getAllTags(): TagInfo[] {
    const tags: TagInfo[] = [];
    this.tagsMap.value.forEach((element, key) => {
      tags.push({ key, element });
    });
    return tags;
  }

  /**
   * 根据 key 筛选标注
   */
  getTagByKey(key: string): TagInfo | undefined {
    const element = this.tagsMap.value.get(key);
    if (element) {
      return { key, element };
    }
    return undefined;
  }

  /**
   * 清空所有标注
   */
  clearAllTags() {
    this.tagsMap.value.clear();
  }
}
```

## v-tag Directive

```typescript
import { DirectiveBinding, App } from "vue";
import { TagManager } from "./TagManager";

const TAG_MANAGER_KEY = "tag-manager";

/**
 * 注册全局指令 v-tag
 */
export function registerTagDirective(app: App, tagManager: TagManager) {
  app.provide(TAG_MANAGER_KEY, tagManager);

  app.directive("tag", {
    mounted(el: HTMLElement, binding) {
      const key = binding.arg;
      if (!key) throw new Error("v-tag requires a key");

      const observer = new MutationObserver(() => {
        if (!document.contains(el)) {
          tagManager.removeTag(key);
          observer.disconnect();
        }
      });

      tagManager.addTag(key, el);
      el.dataset.tagKey = key;
    },
  });
}
```

## ToolFunction

```typescript
import { inject } from 'vue'
import { TagManager } from './TagManager'

const TAG_MANAGER_KEY = 'tag-manager'

/**
 * 获取全局 TagManager 实例
 */
export function useTagManager() {
  const tagManager = inject(TAG_MANAGER_KEY)
  if (!tagManager) throw new Error('TagManager not installed')
  return tagManager as TagManager
}
```
