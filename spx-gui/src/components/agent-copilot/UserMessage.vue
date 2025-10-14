<script setup lang="ts">
import MarkdownView from './markdown/MarkdownView.vue'
import { useSignedInUser } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'

const props = defineProps<{
  content: string
}>()

const { data: signedInUser } = useSignedInUser()
const avatarUrl = useAvatarUrl(() => signedInUser.value?.avatar)
</script>

<template>
  <section class="user-message">
    <img class="avatar" :src="avatarUrl ?? undefined" />
    <MarkdownView class="content" :value="props.content" />
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
