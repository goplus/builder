# Mask 伪代码

## 在编辑器页面的使用

```vue
<script lang="ts" setup>
const visible = ref(false); // Mask的显示隐藏
const path = ref(["infoBox", "confirm"]); // 当前步骤需要高亮显示的组件的查找路径
const editConsumerRef = ref(); // 要调用的tagConsumer组件的示例
</script>

<template>
  <TagConsumer ref="editConsumerRef"> ... </TagConsumer>
  <Mask :visible="visible" :path="path" tagConsumerRef="editConsumerRef" />
</template>
```
