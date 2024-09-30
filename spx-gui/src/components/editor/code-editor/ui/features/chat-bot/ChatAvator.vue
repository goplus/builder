<script setup lang="ts">
import { useUserStore } from '@/stores'
import ChatBot from '../../icons/chat-bot.svg?raw'
import { normalizeIconSize } from '../../common'

defineProps<{
  role: 'assistant' | 'user'
}>()
const userStore = useUserStore()
</script>

<template>
  <div v-if="role === 'assistant'">
    <!-- eslint-disable vue/no-v-html -->
    <span
      :ref="(el) => normalizeIconSize(el as Element, 24)"
      class="chat-avatar"
      v-html="ChatBot"
    ></span>
  </div>
  <div v-else>
    <img
      v-if="userStore.userInfo"
      class="chat-avatar"
      draggable="false"
      :src="userStore.userInfo.avatar"
      :alt="userStore.userInfo.displayName"
    />
  </div>
</template>

<style scoped>
.chat-avatar {
  width: 26px;
  height: 26px;
  border-radius: 10px;
  margin: 0 4px;
  user-select: none;
}
</style>
