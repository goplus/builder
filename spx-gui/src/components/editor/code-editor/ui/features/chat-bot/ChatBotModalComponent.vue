<script setup lang="ts">
import UIFormModal from '@/components/ui/modal/UIFormModal.vue'
import UIButton from '@/components/ui/UIButton.vue'
import ChatBubble from './ChatBubble.vue'
import ChatLoading from './ChatLoading.vue'
import { Chat } from '../../../chat-bot'

const emit = defineEmits<{
  cancelled: []
}>()

const props = defineProps<{
  visible: boolean
  chat: Chat
}>()

const resend = async () => {
  await props.chat.resendMessage()
}
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
        v-for="message in chat.chatState.messages"
        :key="message.content"
        :message="message"
        :loading="chat.chatState.loading"
      ></ChatBubble>
      <ChatLoading v-if="chat.chatState.loading"></ChatLoading>
    </div>
    <div v-if="chat.chatState.responseError" class="reload-btn-container">
      <UIButton @click="resend">{{ $t({ zh: '重新发送', en: 'Resend' }) }}</UIButton>
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

.reload-btn-container {
  display: flex;
  justify-content: center;
}
</style>
