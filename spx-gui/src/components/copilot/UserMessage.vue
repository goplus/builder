<script setup lang="ts">
import { useExternalUrl } from '@/utils/utils'
import { useSignedInUser } from '@/stores/user'
import type { UserMessage } from './copilot'
import MarkdownView from './MarkdownView.vue'

defineProps<{
  message: UserMessage
}>()

const signedInUser = useSignedInUser()
// TODO: Disable copilot for unsigned-in users or provide a default avatar
const avatarUrl = useExternalUrl(() => signedInUser.data.value?.avatar)
</script>

<template>
  <section class="user-message">
    <img class="avatar" :src="avatarUrl ?? undefined" />
    <MarkdownView v-if="message.type === 'text'" class="content" :value="message.content" />
    <div v-else-if="message.type === 'event'" class="content">
      <!-- TODO: style for event message -->
      {{ $t(message.name) }}
    </div>
  </section>
</template>

<style lang="scss" scoped>
.user-message {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  align-self: stretch;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.content {
  padding: 8px;
  align-self: stretch;

  border-radius: 0px var(--ui-border-radius-1) var(--ui-border-radius-1) var(--ui-border-radius-1);
  background: #e9ecf7;
}
</style>
