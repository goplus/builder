```ts
type Props = {
  visible: boolean; // 是否显示蒙层
  path: string[]; // 需要高亮组件的查找路径
};

type Expose = {
  zIndex: number; // 蒙层的层级，用于stepPlayer的素材确定层级
};
```
