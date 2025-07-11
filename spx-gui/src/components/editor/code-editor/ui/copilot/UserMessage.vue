<script setup lang="ts">
import { useExternalUrl } from '@/utils/utils'
import { useUserStore } from '@/stores/user'
import type { BasicMarkdownString } from '../../common'
import MarkdownView from '../markdown/MarkdownView.vue'

defineProps<{
  content: BasicMarkdownString
}>()

const userStore = useUserStore()
// TODO: Disable copilot for unsigned-in users or provide a default avatar
const avatarUrl = useExternalUrl(() => userStore.getSignedInUser()?.avatar)
</script>

<template>
  <section class="user-message">
    <img class="avatar" :src="avatarUrl ?? undefined" />
    <MarkdownView class="content" v-bind="content" />
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
