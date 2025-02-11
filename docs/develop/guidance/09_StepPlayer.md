# StepPlayer

步骤执行模块负责单一步骤的执行与销毁。当步骤执行器传入 stepId 后，会适配 UI（包含开始快照加载），检测事件触发且 isChecked 为 true 时调用检测方法，结果正确则触发 stepCompleted 事件通知 LevelCoordinator。

- 接口定义

```ts
type Props = {
  // 基础信息
  id: number           // 步骤ID
  type: string         // 步骤类型(coding/follow)
  name: string        // 步骤名称
  desc: string        // 步骤描述
  isChecked: boolean  // 是否需要检查
    
  // 跟随步骤特有
  element: string      // 需要操作的元素的键名
  
  // UI相关
  placement: string    // 提示框位置
  
  // 快照相关
  startSnapshot?: any  // 初始快照
  endSnapshot?: any    // 结束快照
}

type Events = {
  stepCompleted: []
}
```

- 功能说明
  - `adaptUI`: 根据步骤 ID 适配编辑器 UI
  - `checkAnswer`: 检查答案是否正确
  - `completeStep`: 完成步骤，触发 stepCompleted 事件
  - `handleMaskElement`: 处理蒙层元素点击
  - `handleShowDesc`: 显示步骤描述
  - `handleShowAnswer`: 显示答案
  - `handleCheckAnswer`: 检查答案

- 实现示例

```vue
<script setup lang="ts">
  import { onMounted } from 'vue'
  import { UIAdapter } from '../apis/UIAdapter'
  import { Mask } from '../components/Mask'
  
  interface Props {
    id: number
    type: string
    desc: string
    answer?: string
    isChecked: boolean
    element: string
    startSnapshot: any
    endSnapshot: any
  }

  const props = defineProps<Props>()
  const emit = defineEmits(['stepComplete'])
  
  // 初始化加载开始快照
  onMounted(() => {
    UIAdapter.adaptUI(props.id)
  })
  
  // 控制按钮显示
  const showButtons = computed(() => {
    return props.type === 'coding'
  })
  
  // 组件方法
  const showDesc = () => {
    // 显示步骤描述逻辑
  }
  
  const showAnswer = () => {
    // 显示答案逻辑  
  }
  
  const checkAnswer = (): boolean => {
    if (!props.isChecked) return true
    return compareSnapshots(props.endSnapshot, props.answer)
  }
  
  const completeStep = () => {
    const isCorrect = checkAnswer()
    if (isCorrect) {
      // 发送给LevelCoordinator的handleStepCompleted事件
    }
    return isCorrect
  }
  
  // 事件处理
  const handleShowDesc = () => {
    showDesc()
  }
  
  const handleShowAnswer = () => {
    showAnswer() 
  }
  
  const handleMaskElement = (element: string) => {
    Mask.show(element)
    // 跟随式步骤在用户操作后检查完成
    if (props.type === 'follow') {
      completeStep()
    }
  }
  
  const handleCheckAnswer = () => {
    completeStep()
  }
  
  const compareSnapshots = (snapshot: any, answer: string): boolean => {
    return snapshot.answer === answer
  }
</script>

<template>
  <div class="step-guide">
  <!-- 步骤控制按钮 -->
  <div class="step-controls">
    <!-- 步骤描述按钮始终显示 -->
    <button @click="handleShowDesc">查看步骤</button>
      
    <!-- 编码类型步骤才显示的按钮 -->
    <template v-if="showButtons">
      <button @click="handleShowAnswer">查看答案</button>
      <button @click="handleCheckAnswer">检查答案</button>
    </template>
  </div>

  <!-- 步骤内容区域 -->
  <div class="step-content">
    <div v-for="element in elementList" 
       :key="element"
       @click="handleMaskElement(element)">
      {{ element }}
    </div>
  </div>
  </div>
</template>
```
