<script setup lang="ts">
import { inject } from 'vue'
import CopilotUI from '@/components/copilot/CopilotUI.vue'
import type { CopilotController } from '@/components/copilot'
import { useCopilotChat } from './init'

const controller = inject('copilotController') as CopilotController | undefined

// 获取聊天可见性控制
const { isVisible, close: closeChat } = useCopilotChat()
</script>

<template>
  <aside v-if="isVisible && controller" class="copilot-chat-container">
      <CopilotUI
        :controller="controller"
        class="copilot-ui"
        @close="closeChat"
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