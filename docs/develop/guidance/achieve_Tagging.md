# Tagging 内部实现说明

Tagging 主要有三部分组成：

- `<Tag />`: 用于给组件添加标注的 vue component
- `<TagRoot />`: 作为跟组件，收集`<Tag/>`上报的节点信息并构建`tagTree`，并向外提供方法。
- `useTagRoot`: 用于返回给消费方`<TagRoot>`提供的方法。

## 实现原理说明

1. 上下文管理：

- 使用 `Vue` 的 `provide/inject` 实现跨多层级的组件通信
- 每个 `Tag` 组件维护自己的子节点列表，间接实现 TagRoot 对子节点的收集
- 通过 `onMounted/onBeforeUnmount` 生命周期管理节点注册，间接实现动态更新

2. 树形结构构建：

- 每个 `Tag` 节点包含 `name`、组件实例和子节点
- 父节点自动收集子节点信息
- 使用响应式对象`(reactive)`自动维护树结构

3. 查询机制：

- 使用深度优先搜索遍历 Tag 树
- 支持路径匹配查询（如`"editorbox check"`）
- 返回匹配的 HTMLElement

4. 组件关系：

- `<TagRoot />` 作为根容器和查询入口
- `<Tag />` 组件支持无限嵌套，自动维护层级关系
- 自动处理组件卸载时的节点清理

## Tag 主要实现

```vue
<script setup lang="ts">
const props = defineProps<{
  name: string;
}>();

const parentContext = inject<TagContext>(TAG_CONTEXT_KEY);
const instance = getCurrentInstance();

// 当前节点的子节点管理
const children = reactive<TagNode[]>([]);

// 提供给子组件的上下文，用于子组件注册到当前节点和从当前节点移除
const currentContext: TagContext = {
  addChild(node: TagNode) {
    children.push(node);
  },
  removeChild(node: TagNode) {
    const index = children.indexOf(node);
    if (index > -1) children.splice(index, 1);
  },
};

provide(TAG_CONTEXT_KEY, currentContext);

// 当前节点信息
const selfNode = reactive<TagNode>({
  name: props.name,
  instance,
  children,
});

// 挂载时注册到父节点
onMounted(() => {
  parentContext?.addChild(selfNode);
});

// 卸载时从父节点移除
onBeforeUnmount(() => {
  parentContext?.removeChild(selfNode);
});
</script>
```

## TagRoot

```vue
<script setup lang="ts">
/* 维护一个root响应式对象，操作tagTree */
const root = reactive<TagNode>({
  name: "__root__",
  instance: null,
  children: [],
});

const getElement = (path: string) => {
  /* 查找算法 */
};

onMounted(() => {
  /*
   * 因为provide/inject存在生命周期的前后问题，
   * 这里使用了一个全局的响应式对象来存储TagRoot所需要暴露的api
   */
  tagApi.value = {
    getElement,
  };
});

onBeforeUnmount(() => {
  tagApi.value = null;
});

/* 提供给子组件的上下文，用于子组件注册到根节点和从当根节点移除
 */
const context: TagContext = {
  addChild(node: TagNode) {
    root.children.push(node);
  },
  removeChild(node: TagNode) {
    const index = root.children.indexOf(node);
    if (index > -1) root.children.splice(index, 1);
  },
};

provide(TAG_CONTEXT_KEY, context);
</script>
```

## tagApi

```ts
/*
 * 因为provide/inject存在生命周期的前后问题，
 * 这里使用了一个全局的响应式对象来存储TagRoot所需要暴露的api
 */
const tagApi = ref<{
  getElement: (path: string) => HTMLElement | null;
} | null>(null);
```

## useTag

```ts
function useTag() {
  const getElement = (path: string) => {
    if (!tagApi.value) {
      throw new Error("TagConsumer not mounted");
    }
    return tagApi.value.getElement(path);
  };

  return {
    getElement,
  };
}
```

## 示例使用

```vue
<script setup lang="ts">
const { getElement } = useTag();

const handleCheck = () => {
  console.log(getElement("editorbox check"));
};

const logCodeContext = () => {
  console.log(getElement("editorbox pre"));
};
</script>

<template>
  <TagRoot>
    <Tag name="editorbox">
      <div class="editor">
        <h2>Coding Here</h2>
        <div class="options">
          <Tag name="check">
            <button @click="handleCheck">Check</button>
          </Tag>
          <Tag name="logpre">
            <button @click="logCodeContext">logpre</button>
          </Tag>
        </div>
        <Tag name="pre">
          <pre>
            <Tag name="code">
              <code>console.log("Hello, Tagging!");</code>
            </Tag>
          </pre>
        </Tag>
      </div>
    </Tag>
  </TagRoot>
</template>
```
