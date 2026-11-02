<script lang="ts" setup>
import { onMounted } from 'vue'

import type { Round } from '@/components/copilot/copilot'

import { useSignedIn } from '@/stores/user'
import { UIButton } from '@/components/ui'

const props = defineProps<{
  round: Round
}>()

const signedIn = useSignedIn()

onMounted(() => {
  if (!signedIn.isSignedIn) return
  props.round.retry()
})
</script>

<template>
  <div class="text-sm/[1.7]">
    <div>{{ $t({ en: 'Please sign in to continue.', zh: '请先登录并继续' }) }}</div>
    <UIButton type="primary" class="mt-4" @click="signedIn.signIn()">
      {{ $t({ en: 'Sign in', zh: '登录' }) }}
    </UIButton>
  </div>
</template>
