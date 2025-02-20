# Mask 伪代码

## 在 stepPlayer 的使用

```vue
<script lang="ts" setup>
const visible = ref(false); // Mask的显示隐藏
const path = ref("editorbox check"); // 当前步骤需要高亮显示的组件的查找路径
const maskRef = ref(); // Mask组件的引用

/* 计算卡通形象、箭头的显示层级 */
const zIndex = computed(() => {
  return maskRef.value.zIndex + 1;
});

/* 计算卡通形象、箭头的位置 */
const position = computed(() => {
  const width = maskRef.value.lightElemntSize.width;
  const hight = maskRef.value.lightElemntSize.height;
  // ...内部处理逻辑
});
</script>

<template>
  <Mask :visible="visible" :path="path" ref="maskRef" />
</template>
```
