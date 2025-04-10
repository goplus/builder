<script setup lang="ts">
import MarkdownView from '@/components/copilot/markdown/MarkdownView.vue'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  content: string
}>()

const userInfo = useUserStore().getSignedInUser() || { avatar: '' }
</script>

<template>
  <section class="user-message">
    <img class="avatar" :src="userInfo?.avatar || ''" />
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
