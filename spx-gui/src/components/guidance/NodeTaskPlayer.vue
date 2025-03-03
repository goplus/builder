<template>
  <div class="node-task-player">
    <!-- 这里未来将会渲染 StepPlayer 组件 -->
    <p>NodeTaskPlayer 开发中...</p>
  </div>
</template>

<script lang="ts" setup>
import type { NodeTask } from './common/types';

// 组件的对外接口
const props = defineProps<{ nodeTask: NodeTask }>();

const emit = defineEmits<{ nodeTaskCompleted: [] }>();

// TODO
</script>

<style scoped>

</style>