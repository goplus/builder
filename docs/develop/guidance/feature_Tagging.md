# Tagging 伪代码

## 全局注册（单例）

```ts
// 通过 provide 全局注册单例
const app = createApp(App);
//
app.provide("Tagging", new Tagging());
```

## 语义化标注（标注方）

```vue
<template>
  <RectComponent data-tag="RectComponent">
    <ButtonComponent data-tag="ButtonComponent" />
    <InputComponent data-tag="InputComponent" />
    ...
  </RectComponent>
</template>
```

## 在 Mask 组件中使用（消费方）

```vue
<script lang="ts" setup>
// 组件内注入
const tagging = inject("Tagging");

// 传入keys参数，查找为 key = ‘RectComponent’ 下的 key = ‘ButtonComponent’ 的组件，类似于CSS类选择器
const element = tagging.getElementByKeys(["RectComponent", "ButtonComponent"]);

const highlightElement = () => {
  const lightElementStyle = {
    ...
    ...
  }

  element.style = highlightElement
}
</script>

<template>
  <div class="mask" v-if="visible">...</div>
</template>
```
