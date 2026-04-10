<script setup lang="ts">
import { useSignedInUser } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import type { UserMessage } from './copilot'
import MarkdownView from './MarkdownView.vue'

defineProps<{
  message: UserMessage
}>()

const signedInUser = useSignedInUser()
const avatarUrl = useAvatarUrl(() => signedInUser.value?.avatar)
</script>

<template>
  <section
    class="self-stretch px-4 py-5"
    :class="message.type === 'text' ? 'flex flex-col items-start gap-2' : 'flex flex-row items-center gap-2'"
  >
    <img class="h-8 w-8 rounded-full" :src="avatarUrl ?? undefined" />
    <MarkdownView
      v-if="message.type === 'text'"
      class="self-stretch rounded-sm rounded-tl-none bg-[#e9ecf7] p-2"
      :value="message.content"
    />
    <div v-else-if="message.type === 'event'" class="flex-[1_1_0]">
      {{ $t(message.name) }}
    </div>
  </section>
</template>
