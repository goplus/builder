# Tagging 伪代码

## 语义化标注（标注方）

### 示例组件

```vue
<template>
  <RootTag>
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
  </RootTag>
</template>
```

## 在 Mask 组件中使用（消费方）

```vue
<script lang="ts" setup>
const { getElement } = useTag()
const path = ref("editorbox check")

const element = getElement(path)

/** 高亮逻辑 */
const highlightComponentStyle = () => {
  ...
}
</script>
```
