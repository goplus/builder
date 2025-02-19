# Tagging 伪代码

## 语义化标注（标注方）

### 示例组件

```vue
<template>
  <RootTag>
    <Tag name="infoBox">
      <div class="info-box">
        <Tag name="content"> ... </Tag>
        <Tag name="confirm"> ... </Tag>
      </div>
    </Tag>
  </RootTag>
</template>
```

## 在 Mask 组件中使用（消费方）

```vue
<script lang="ts" setup>
defineProps({
  path: string[],
  visible: boolean,
})
/** 根据 path 路径查找 instance */
const { find } = useTagFinder()

const instance = find(path)
/** 高亮逻辑 */
const highlightComponentStyle = () => {
  ...
}
</script>
```
