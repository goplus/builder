<script setup lang="ts">
import { computed } from 'vue'

import type { AccountSession } from '@/apis/account'
import { UIFullWidthButton } from '@/components/ui'
import { useAvatarUrl } from '@/stores/user/avatar'

const props = defineProps<{
  session: AccountSession
  switching: boolean
}>()

defineEmits<{
  continue: []
  switchAccount: []
}>()

const avatarUrl = useAvatarUrl(() => props.session.user.avatar)
const avatarFallbackText = computed(() => props.session.user.displayName.trim().charAt(0).toUpperCase() || '?')
</script>

<template>
  <div class="self-stretch flex flex-col items-center gap-5">
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full bg-turquoise-200 overflow-hidden flex items-center justify-center text-2xl font-semibold text-turquoise-600"
      >
        <img
          v-if="avatarUrl != null"
          :src="avatarUrl"
          :alt="session.user.displayName"
          class="h-full w-full object-cover"
        />
        <span v-else>{{ avatarFallbackText }}</span>
      </div>
      <div class="text-text text-xl">{{ session.user.displayName }}</div>
    </div>
    <div class="self-stretch flex flex-col gap-3">
      <UIFullWidthButton primary :disabled="switching" @click="$emit('continue')">
        {{ $t({ en: 'Continue with this account', zh: '继续使用当前账号' }) }}
      </UIFullWidthButton>
      <UIFullWidthButton :disabled="switching" @click="$emit('switchAccount')">
        {{ $t({ en: 'Use another account', zh: '切换其它账号登录' }) }}
      </UIFullWidthButton>
    </div>
  </div>
</template>
