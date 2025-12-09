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
  <div class="sign-in-container">
    <div class="message">{{ $t({ en: 'Please sign in to continue.', zh: '请先登录并继续' }) }}</div>
    <UIButton variant="flat" class="sign-in-btn" @click="initiateSignIn()">
      {{ $t({ en: 'Sign in', zh: '登录' }) }}
    </UIButton>
  </div>
</template>

<style lang="scss" scoped>
.sign-in-container {
  font-size: 13px;
  line-height: 1.7;

  .sign-in-btn {
    margin-top: 16px;
  }
}
</style>
