<script lang="ts" setup>
import { onMounted } from 'vue'

import { Round, RoundState } from '../copilot'

import { initiateSignIn, isSignedIn } from '@/stores/user'

const props = defineProps<{
  round: Round
}>()

onMounted(() => {
  if (!props.round || !isSignedIn()) return
  if (props.round.state !== RoundState.Failed) return

  props.round.retry()
})
</script>

<template>
  <div class="sign-in-container">
    <div class="message">{{ $t({ en: 'Please sign in to continue.', zh: '请先登录并继续' }) }}</div>
    <button class="sign-in-btn" @click="initiateSignIn()">
      {{ $t({ en: 'Sign in', zh: '登录' }) }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.sign-in-container {
  font-size: 13px;
  line-height: 1.7;

  .sign-in-btn {
    --bg-color: var(--ui-color-turquoise-500);
    border-radius: var(--ui-border-radius-2);
    background: var(--bg-color);
    border: 1px solid var(--bg-color);
    color: var(--ui-color-grey-100);
    font-size: 13px;
    line-height: inherit;
    padding: 0 16px;
    text-align: center;
    height: 32px;
    white-space: normal;
    margin-top: 16px;
    transition: 0.3s;
    cursor: pointer;

    &:hover {
      --bg-color: var(--ui-color-turquoise-400);
    }
    &:active {
      --bg-color: var(--ui-color-turquoise-600);
    }
    &:focus {
      --bg-color: var(--ui-color-turquoise-500);
    }
  }
}
</style>
