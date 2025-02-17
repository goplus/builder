# Tagging 伪代码

## 全局注册（单例）

```ts
// 通过 provide 全局注册单例
const app = createApp(App);
//
app.provide("Tagging", new Tagging());
```

## 语义化标注（标注方）

### 示例组件

```vue
<!-- 示例组件1 -->
<template>
  <Father data-tag="father">
    <Son data-tag="son" />
    <Daughter data-tag="daughter" />
  </Father>
</template>

<!-- 示例组件2 -->
<template>
  <Mather data-tag="mather">
    <Son data-tag="son" />
    <Daughter data-tag="daughter" />
  </Mather>
</template>
```

### Tagging 中保存示例组件树结构信息

```ts
this.tagTree = {
  father: {
    e: FatherComponent,
    children: {
      son: {
        e: SonComponent,
        children: {},
      },
      daughter: {
        e: DaughterComponent,
        children: {},
      },
    },
  },
  mather: {
    e: MatherComponent,
    children: {
      son: {
        e: SonComponent,
        children: {},
      },
      daughter: {
        e: DaughterComponent,
        children: {},
      },
    },
  },
};
```

## 在 Mask 组件中使用（消费方）

```vue
<script lang="ts" setup>
// 组件内注入
const tagging = inject("Tagging");

// 传入keys参数，查找为 key = 'mother' 下的 key = 'son' 的组件，类似于CSS类选择器
const component: Component = tagging.getElementByKeys(["mother", "son"]);

const highlightComponentStyle = () => {
  const lightElementStyle = {
    ...
    ...
  }

  component.style = highlightComponentStyle
}
</script>

<template>
  <div class="mask" v-if="visible">...</div>
</template>
```
