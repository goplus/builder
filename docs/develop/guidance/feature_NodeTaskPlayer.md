```vue
<!-- NodeTaskPlayer.vue -->
<template>
  <div class="node-task-player">
    <!-- 渲染当前步骤的 StepPlayer -->
    <StepPlayer
      v-if="currentStep"
      :step="currentStep"
      @stepCompleted="handleStepCompleted"
    />
  </div>
</template>

<script lang="ts" setup>

// 接收 NodeTask 作为 prop
const props = defineProps<{ nodeTask: NodeTask }>()
// 定义节点任务完成事件
const emit = defineEmits<{ (e: 'nodetaskCompleted'): void }>()

// 当前步骤的索引
const currentStepIndex = ref(0)
// 计算当前步骤（StepPlayer 渲染当前步骤）
const currentStep = computed<Step | undefined>(() => props.nodeTask.steps[currentStepIndex.value])

function handleStepCompleted(): void {
  currentStepIndex.value++
  if (currentStepIndex.value === props.nodeTask.steps.length) {
    // 所有步骤完成后，通知父组件（LevelPlayer）节点任务完成
    emit('nodetaskCompleted')
  }
}
</script>
```