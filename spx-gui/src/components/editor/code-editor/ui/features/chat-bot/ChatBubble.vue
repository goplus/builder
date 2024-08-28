<script setup lang="ts">
import MarkdownPreview from '../../MarkdownPreview.vue';
import ChatAvator from './ChatAvator.vue';
import ChatSuggestItem from './ChatSuggestItem.vue';
import type { ChatAction, ChatMessage } from './chat-bot';

defineProps<{message: ChatMessage}>()

const nextMessage = (q: ChatAction) => {
    q.click(q.action)
}

</script>

<template>
    <div class="container" :style="{ alignItems: message.role === 'assistant' ? 'flex-start' : 'flex-end' }">
        <ChatAvator :role="message.role"></ChatAvator>
        <MarkdownPreview class="bubble" :content="message.content"></MarkdownPreview>
        <div v-if="message.role === 'assistant' && message.actions" class="suggestions">
            <ChatSuggestItem v-for="a, index in message.actions" :key="index" :content="a.action" @click="nextMessage(a)">
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

.bubble {
    max-width: 80%;
    overflow: auto;
    padding: 10px;
    border-radius: var(--ui-border-radius-2);
    background-color: var(--ui-color-grey-100);
}

.suggestions {
    display: flex;
    flex-direction: row;
    gap: 5px;
    margin: 6px 0 0 2px;
}
</style>