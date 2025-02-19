## Tag 标注方

```ts
/** 节点信息 */
export interface TagNode {
  name: string;
  instance: any;
  children: TagNode[];
}

/** 每个节点对子节点提供的上下文 */
export interface TagContext {
  addChild: (node: TagNode) => void; // 挂载时，子节点注册到父节点
  removeChild: (node: TagNode) => void; // 卸载时，子节点从父节点中移除
}
```

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

## TagConsumer 消费方

```ts
/** 对如Mask模块提供的方法 */
type Expose = {
  find(path: string[]) => TagNode.instance
}

/** 跟节点对子节点提供TagContext，用于子节点向跟节点注册 */
type Provide = {
  currentContext: TagContext
}

/** 注意：TagConsumer如果存在嵌套情况，当前的TagConsumer不会向上上报自己tagTree。
 * 即：父TagConsumer或者Tag不知道子TagConsumer的存在，他们之间维护的tagTree是独立的
 */
```
