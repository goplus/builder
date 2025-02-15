# Mask 伪代码

## 组件调用

```vue
<script lang="ts" setup>
const visible = ref(false); // Mask是否显示
const currentTags = ref(["RectComponent", "ButtonComponent"]); // 当前步骤需要高亮显示的组件的查找路径
</script>

<template>
  <Mask :visible="visible" :tags="currentTags" />
</template>
```
