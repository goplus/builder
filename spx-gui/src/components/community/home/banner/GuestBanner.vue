<script setup lang="ts">
import { initiateSignIn } from '@/stores/user'
import { UIButton } from '@/components/ui'
import CommunityCard from '../../CommunityCard.vue'

function handleJoin() {
  initiateSignIn()
}
</script>

<template>
  <CommunityCard class="guest-banner">
    <div class="main">
      <h1 class="title">
        {{ $t({ en: 'Join XBuilder', zh: '加入 XBuilder' }) }}
      </h1>
      <h4 class="sub-title">
        {{ $t({ en: 'Build and share your projects', zh: '创作并分享你的作品' }) }}
      </h4>
      <UIButton
        v-radar="{ name: 'Join now button', desc: 'Click to sign in/up' }"
        class="join-btn"
        color="primary"
        size="large"
        @click="handleJoin"
      >
        {{ $t({ en: 'Join now', zh: '立即加入' }) }}
      </UIButton>
    </div>
  </CommunityCard>
</template>

<style lang="scss" scoped>
.guest-banner {
  padding: 12px;
}

.main {
  position: relative;
  padding: 48px 52px 50px;

  border-radius: var(--ui-border-radius-2);
  color: #073156;
  background-color: #f0faff;
  background-image: url('./bg.svg');
  background-repeat: no-repeat;
  background-position: center right 54px;
}

.title {
  font-size: 24px;
  line-height: 1.5;
}

.sub-title {
  font-size: 13px;
  line-height: 20px;
  margin-top: 8px;
}

.join-btn {
  margin-top: 28px;
}
</style>
