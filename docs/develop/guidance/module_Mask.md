```ts
type Props = {
  visible: boolean; // 是否显示蒙层
  highlightElementPath: string; // 需要高亮组件的查找路径
};

type Slots = {
  left: number; // 高亮区域的左边距
  top: number; // 高亮区域的上边距
  width: number; // 高亮区域的宽度
  hight: number; // 高亮区域的高度
  // 注意区别高亮区域与高亮组件，高亮区域相对于高亮组件有padding值。
};
```
