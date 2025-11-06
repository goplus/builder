<script lang="ts">
import { z } from 'zod'
import { UITag } from '@/components/ui'
import { computed, onMounted } from 'vue'
import { useCopilot } from '../CopilotRoot.vue'
import { RoundState } from '../copilot'

export const tagName = 'sign-in-btn'
export const description = `Never include <${tagName} /> in the message`
export const attributes = z.object({})
export const isRaw = false
</script>

<script lang="ts" setup>
import { initiateSignIn, isSignedIn } from '@/stores/user'

const copilot = useCopilot()

const activeRound = computed(() => copilot.currentSession?.currentRound)

onMounted(() => {
  if (!activeRound.value || !isSignedIn()) return
  if (activeRound.value.state !== RoundState.Failed) return

  activeRound.value.retry()
})
</script>

<template>
  <UITag type="primary" class="sign-in-button" @click="initiateSignIn()">
    {{ $t({ en: 'Sign in', zh: '登录' }) }}
  </UITag>
</template>
