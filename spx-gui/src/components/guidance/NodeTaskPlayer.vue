<template>
  <div class="node-task-player">
    <!-- 渲染当前步骤的 StepPlayer -->
    <StepPlayer
      v-if="currentStep"
      :step="currentStep"
      @step-completed="handleStepCompleted"
    />
  </div>
</template>

<script lang="ts" setup>
import type { NodeTask, Step } from '@/apis/guidance';
import { ref, computed } from 'vue';
import StepPlayer from './StepPlayer.vue';

const props = defineProps<{ nodeTask: NodeTask }>();

const emit = defineEmits<{ nodeTaskCompleted: [] }>();

// 当前步骤的索引
const currentStepIndex = ref(0)
// 计算当前步骤（StepPlayer 渲染当前步骤）
const currentStep = computed<Step | undefined>(() => props.nodeTask.steps[currentStepIndex.value])

function handleStepCompleted(): void {
  currentStepIndex.value++
  if (currentStepIndex.value === props.nodeTask.steps.length) {
    // 所有步骤完成后，通知父组件（LevelPlayer）节点任务完成
    emit('nodeTaskCompleted')
  }
}
</script>

<style scoped>

</style>