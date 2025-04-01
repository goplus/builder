<script setup lang="ts">
import CopilotUI from '@/components/copilot/CopilotUI.vue'
import type { CopilotController } from '@/components/copilot'

const props = defineProps<{
  controller: CopilotController,
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <aside class="copilot-chat-container">
      <CopilotUI
        :controller="props.controller"
        class="copilot-ui"
        @close="emit('close')"
      />
  </aside>
</template>

<style lang="scss" scoped>
.copilot-chat-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 25%; /* 占总宽度的 1/4 */
  height: 100vh;
  background-color: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 1000;

  .copilot-ui {
    flex: 1;
    /* 覆盖 CopilotUI 的默认宽度设置（如果有的话） */
    width: 100% !important;
    max-width: 100% !important;
  }
}

// 媒体查询，在小屏幕上调整宽度
@media (max-width: 1200px) {
  .copilot-chat-container {
    width: 300px; // 小屏幕上使用固定宽度
  }
}

@media (max-width: 768px) {
  .copilot-chat-container {
    width: 100%; // 在移动设备上占满全屏
  }
}
</style>