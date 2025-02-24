## 对外接口

1. Tag

`<Tag />` 是一个用于给组件添加标注的 vue component

```ts
type Props = {
  name: string;
};
```

2. TagRoot

`<TagRoot />` 是一个用于收集`<Tag/>`上报的节点信息并构建`tagTree`，会向外提供方法的 vue component。全局应该仅存在一个`<TagRoot>`组件在作为所有`<Tag/>`组件的根组件。

3. useTagRoot

useTagRoot 是一个用于对外暴露 `<TagRoot />` 的方法的函数

```ts
interface UseTagReturnType {
  // 通过传入path路径 准确返回目标元素或者null值
  getElement(path: string): HTMLElement;
}

function useTagRoot(): UseTagReturnType;
```

`path`: 是一个或者多个`<Tag />`的`name`的组合，通过传入`path`参数可以返回对应的目标元素或者返回`null`值。
如：

- `"name1 name2 name3"`会准确返回 `name3` 所包裹的元素
- 如果树节点数为 0，则会返回一个`null`值
- 如果找不到目标元素，则会返回一个`null`值
