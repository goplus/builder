## 全局内容

```ts
/** 节点信息 */
export type TagNode = {
  name: string,
  instance: any,
  children: TagNode[]
}

/** 每个节点对子节点提供的上下文 */
export type TagContext = {
  addChild: (node: TagNode) => void, // 挂载时，子节点注册到父节点
  removeChild: (node: TagNode) => void, // 卸载时，子节点从父节点中移除
}

/** 提供一个全局tagApi，
 * 1. 供RootTag把自己的find方法注册，
 * 2. 供useTagFinder使用find方法 */
export type tagApi = {
  find: (path: string[]): any | null
}
```

## Tag 标注方

```ts
/** 节点的标注信息 */
type Props = {
  name: string;
};

/** 当前节点对子节点提供TagContext，用于子节点向当前节点注册 */
type Provide = {
  currentContext: TagContext;
};

/** 当前节点对需要向父节点注册的信息 */
type Inject = {
  selfNode: TagNode;
};
```

## RootTag 消费方

```ts
/** 跟节点对子节点提供TagContext，用于子节点向跟节点注册 */
type Provide = {
  currentContext: TagContext;
};

/** 解释：
 * RootTag 需要把自己的 find 方法传给全局tagApi :
 * 如：tagApi.value.find = find
 */
```

## useTagFinder 消费方

```ts
/**
 * useTagFinder 通过 全局的tagApi 返回 tagApi.find 方法
 */
export function find: (path: string[]) => any | null
```
