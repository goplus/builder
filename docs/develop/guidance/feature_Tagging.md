# Tagging 伪代码

## 语义化标注（标注方）

### 示例组件

```vue
<template>
  <TagConsumer ref="rootConsumerRef">
    <Tag name="infoBox">
      <div class="info-box">
        <!-- contentConsumerRef 不会上报自己的tagTree -->
        <TagConsumer ref="contentConsumerRef">
          <Tag name="content"> ... </Tag>
        </TagConsumer>
        <Tag name="confirm"> ... </Tag>
      </div>
    </Tag>
    <ClickToRender />
  </TagConsumer>
</template>
```

### 示例组件的 TagTree

```ts
// rootConsumerRef的tagTree
{
  name: "_root_",
  instance: null,
  children: [
    {
      name: "infoBox",
      instance: ...,
      children: [
        {
          name: "confirm",
          instance: xxx,
          children: []
        }
      ]
    }
  ]
}

// contentConsumerRef的tagTree
{
  name: "_root_",
  instance: null,
  children: [
    {
      name: "content",
      instance: xxx,
      children: []
    }
  ]
}
```

## 在 Mask 组件中使用（消费方）

```vue
<script lang="ts" setup>
defineProps({
  path: string[],
  visible: boolean,
  tagConsumerRef: componentInstance
})
/** 根据 path 路径查找 instance */
const instance = tagConsumerRef.value?.find(["infoBox", "confirm"])

/** 高亮逻辑 */
const highlightComponentStyle = () => {
  ...
}
</script>
```
