<script setup lang="ts">
import { useSignedInUser } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import type { UserMessage } from './copilot'
import MarkdownView from './MarkdownView.vue'

defineProps<{
  message: UserMessage
}>()

const signedInUser = useSignedInUser()
const avatarUrl = useAvatarUrl(() => signedInUser.data.value?.avatar)
</script>

<template>
  <section class="user-message" :class="`type-${message.type}`">
    <img class="avatar" :src="avatarUrl ?? undefined" />
    <MarkdownView v-if="message.type === 'text'" class="content" :value="message.content" />
    <div v-else-if="message.type === 'event'" class="content">
      {{ $t(message.name) }}
    </div>
  </section>
</template>

<style lang="scss" scoped>
.user-message {
  padding: 20px 16px;
  display: flex;
  align-self: stretch;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.type-text {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;

  .content {
    padding: 8px;
    align-self: stretch;

    border-radius: 0px var(--ui-border-radius-1) var(--ui-border-radius-1) var(--ui-border-radius-1);
    background: #e9ecf7;
  }
}

.type-event {
  flex-direction: row;
  gap: 8px;
  align-items: center;

  .content {
    flex: 1 1 0;
  }
}
</style>
