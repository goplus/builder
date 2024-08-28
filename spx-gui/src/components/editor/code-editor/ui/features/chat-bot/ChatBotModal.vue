<script setup lang="ts">
import UIFormModal from '@/components/ui/modal/UIFormModal.vue'
import ChatBubble from './ChatBubble.vue'
import type { Chat, ChatMessage } from './chat-bot'

const emit = defineEmits<{
  cancelled: []
}>()

const messages: ChatMessage[] = []

const pushMessage = (message: ChatMessage) => {
  messages.push(message)
}

defineProps<{
  visible: boolean
  chat: Chat
}>()
</script>

<template>
  <UIFormModal
    :visible="visible"
    :title="$t({ zh: '聊天机器人', en: 'Chat Bot' })"
    size="large"
    :body-style="{ backgroundColor: 'var(--ui-color-grey-300)' }"
    @update:visible="emit('cancelled')"
  >
    <div class="container">
      <ChatBubble
        v-for="message in messages"
        :key="message.content"
        :message="message"
      ></ChatBubble>
    </div>
  </UIFormModal>
</template>

<style scoped lang="scss">
.container {
  height: 513px;
  overflow-y: auto;
}

.container::-webkit-scrollbar {
  background: transparent;
  width: 8px;
}

.container::-webkit-scrollbar-thumb {
  background: var(--ui-color-grey-500);
  border-radius: 4px;
}
</style>
