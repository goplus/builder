## 对外接口

1. Tag 标注

Tag 标注用于给组件添加标注

```ts
type Props = {
  name: string;
};
```

2. useTag

useTag 用于对外暴露 TagRoot 的方法

```ts
interface UseTagReturnType {
  getElement(path: string): HTMLElement;
}
```
