```vue
<!-- LevelPlayer.vue -->
<template>
  <div class="level-player">
    <!-- 可拖拽的卡片组（悬浮卡片+悬浮按钮） -->
    <div class="card-group">
      <!-- VideoPlayer 组件，同时使用具名插槽 "cover" 定义封面内容 -->
      <VideoPlayer ref="videoPlayerRef" 
        @segmentReached="handleSegmentReached">
        <template #cover>
          ...
        </template>
      </VideoPlayer>
    </div>

    <!-- 当有当前节点任务时，渲染 NodeTaskPlayer 组件 -->
    <NodeTaskPlayer
      v-if="currentNodeTask"
      :nodeTask="currentNodeTask"
      @nodeTaskCompleted="handleNodeTaskCompleted"
    />
  </div>
</template>

<script lang="ts" setup>
// 接收 Level 作为 prop
const props = defineProps<{ level: Level }>()

// VideoPlayer 组件实例引用
const videoPlayerRef = ref<any>(null)
// 当前正在执行的 NodeTask的下标索引
const currentNodeTaskIndex = ref<number | null>(null)
// 当前正在执行的 NodeTask
const currentNodeTask = ref<NodeTask | null>(null)

/**
 * 当 VideoPlayer 触发 "segmentReached" 事件时调用
 * 从 segment.extension 中读取 nodeTaskIndex，然后在 level.nodeTasks 中查找对应的 NodeTask
 */
function handleSegmentReached(segment: Segment): void {
  // 显示封面并暂停视频
  videoPlayerRef.value.showCover()
  videoPlayerRef.value.pause()

  currentNodeTaskIndex.value = segment.extension?.nodeTaskIndex

  currentNodeTask.value = props.level.nodeTasks[currentNodeTaskIndex.value]
}

/**
 * 当 节点任务完成后调用：
 * 如果当前节点任务为最后一个节点任务，则更新封面内容（cover slot 的内容，主要渲染本关的成就、以及相关按钮（重玩本关、进入下一关、返回故事线）），
 * 如果不是最后一个节点任务，通知 VideoPlayer 隐藏封面并恢复播放，
 * 清除当前任务状态。
 */
function handleNodeTaskCompleted(): void {
  // 如果当前节点任务是最后一个节点任务，则更新 cover 插槽内容
  if (currentTaskNodeIndex.value !== null && currentTaskNodeIndex.value === props.level.nodeTasks.length - 1) {
    // 更新 cover 插槽内容
  }else{
    videoPlayerRef.value.hideCover()
    videoPlayerRef.value.play()
  }
  currentNodeTask.value = null
  currentNodeTaskIndex.value = null
}
</script>
```