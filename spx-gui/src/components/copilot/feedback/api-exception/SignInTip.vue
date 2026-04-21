<script lang="ts" setup>
import { onMounted } from 'vue'

import type { Round } from '@/components/copilot/copilot'

import { initiateSignIn, isSignedIn } from '@/stores/user'
import { UIButton } from '@/components/ui'

const props = defineProps<{
  round: Round
}>()

onMounted(() => {
  if (!isSignedIn()) return
  props.round.retry()
})
</script>

<template>
  <div class="text-sm/[1.7]">
    <div>{{ $t({ en: 'Please sign in to continue.', zh: '请先登录并继续' }) }}</div>
    <UIButton type="primary" class="mt-4" @click="initiateSignIn()">
      {{ $t({ en: 'Sign in', zh: '登录' }) }}
    </UIButton>
  </div>
</template>
