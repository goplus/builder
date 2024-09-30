<script setup lang="ts">
import MarkdownPreview from '../../MarkdownPreview.vue'
import ChatAvator from './ChatAvator.vue'
import ChatSuggestItem from './ChatSuggestItem.vue'
import type { ChatMessage, ContinueAction } from '../../../chat-bot'

defineProps<{ message: ChatMessage; loading: boolean }>()

const nextMessage = (q: ContinueAction) => {
  q.click()
}
</script>

<template>
  <div
    class="container"
    :style="{ alignItems: message.role === 'assistant' ? 'flex-start' : 'flex-end' }"
  >
    <ChatAvator :role="message.role"></ChatAvator>
    <MarkdownPreview class="bubble" :content="message.content"></MarkdownPreview>
    <div v-if="message.role === 'assistant' && message.actions && !loading" class="suggestions">
      <ChatSuggestItem
        v-for="(a, index) in message.actions"
        :key="index"
        :content="a.action"
        @click="nextMessage(a)"
      >
      </ChatSuggestItem>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  height: auto !important;
  margin-bottom: 10px;
}

.container:last-of-type > .suggestions {
  display: flex;
}

.bubble {
  max-width: 80%;
  overflow: auto;
  padding: 10px;
  border-radius: var(--ui-border-radius-2);
  background-color: var(--ui-color-grey-100);
}

.container .suggestions {
  display: none;
  flex-direction: row;
  gap: 5px;
  margin: 6px 0 0 2px;
}
</style>
