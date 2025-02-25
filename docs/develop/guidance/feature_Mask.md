# Mask 伪代码

## Mask 对其 slot 传入 props

```vue
<script setup>
const MaskProps = {
  left: ...,
  top: ...,
  width: ...,
  hight: ...
};
</script>

<template>
  <div class="mask">
    <slot :slotProps="MaskProps"></slot>
  </div>
</template>
```

## 在 stepPlayer 的使用

```vue
<script lang="ts" setup>
const visible = ref(false); // Mask的显示隐藏
const highlightElementPath = ref("editorbox check"); // 当前步骤需要高亮显示的组件的查找路径

const handleSlotProps = (slotProps) => {
  // 内部处理逻辑
};
</script>

<template>
  <Mask
    :visible="visible"
    :highlightElementPath="highlightElementPath"
    v-slot="slotProps"
  >
    <div class="arrow" :style="handleSlotProps(slotProps)"></div>
  </Mask>
</template>
```
