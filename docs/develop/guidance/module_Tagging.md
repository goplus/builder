## 对外接口

1. TagRoot

`<TagRoot />` 是一个用于收集`<TagNode />`上报的节点信息并构建`tagTree`，会向外提供方法的 vue component。全局应该仅存在一个`<TagRoot>`组件在作为所有`<TagNode/>`组件的根组件。

2. TagNode

`<TagNode />` 是一个用于给组件添加标注的 vue component

```ts
type Props = {
  name: string;
};
```

3. TagSelector

`<TagSelector />` 是一个用于选择 Guidnace 中`<TagNode />`的 vue component，行为类似于 VueDevTools 中的`Select Component`功能

```ts
type Emits = {
  // 可视化选中某个 TagNode，触发selected事件，传递path参数
  selected(path: string): void;
};
```

4. useTag

useTag 是一个用于对外暴露 `<TagRoot />` 的方法的函数

```ts
interface UseTagReturnType {
  // 通过传入path路径 准确返回目标元素或者null值
  getElement(path: string): HTMLElement | null;
  getInstance(path: string): unknown;
  getAllTagElements(): any;
}

function useTag(): UseTagReturnType;
```

`path`: 是一个或者多个`<TagNode />`的`name`的组合，通过传入`path`参数可以返回对应的目标元素或者返回`null`值。
如：

- `"name1 name2 name3"`会准确返回 `name3` 所包裹的元素
- 如果树节点数为 0，则会返回一个`null`值
- 如果找不到目标元素，则会返回一个`null`值
