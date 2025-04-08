# Tagging 伪代码

## 语义化标注（标注方）

### 示例组件

```vue
<template>
  <TagRoot>
    <Tag name="editorbox">
      <div class="editor">
        <h2>Coding Here</h2>
        <div class="options">
          <Tag name="check">
            <button @click="handleCheck">Check</button>
          </Tag>
          <Tag name="logpre">
            <button @click="logCodeContext">logpre</button>
          </Tag>
        </div>
        <Tag name="pre">
          <pre>
            <Tag name="code">
              <code>console.log("Hello, World!");</code>
            </Tag>
          </pre>
        </Tag>
      </div>
    </Tag>
  </TagRoot>
</template>
```

## 在 Mask 组件中使用（消费方）

```vue
<script lang="ts" setup>
defineProps({
  highlightElementPath: string,
  ...
})
const { getElement } = useTagRoot()

const element = getElement(highlightElementPath)

/** 高亮逻辑 */
const highlightElementStyle = () => {
  ...
}
</script>
```

## 在 StepEditor 中使用（消费方）

```vue
<template>
  <!-- 省略其他代码 -->
  <TagSelector v-if="isShowTagSelector" @selected="handleSelected" />
</template>

<script lang="ts" setup>
import { ref } from "vue";

const isShowTagSelector = ref(false);
const handleSelected = (path: string) => {
  // 处理选中事件
};
</script>
```
