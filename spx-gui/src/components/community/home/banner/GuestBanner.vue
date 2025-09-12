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
        type="primary"
        size="large"
        @click="handleJoin"
      >
        {{ $t({ en: 'Join now', zh: '立即加入' }) }}
      </UIButton>
    </div>
  </CommunityCard>
</template>

<style lang="scss" scoped>
@import '@/components/ui/responsive.scss';

.guest-banner {
  padding: 12px;
  font-size: 24px;

  @include responsive(mobile) {
    padding: 8px;
    font-size: 18px;
  }
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

  @include responsive(mobile) {
    padding: 32px 24px 36px;
    background-position: center right 20px;
    background-size: auto 80%;
  }
}

.title {
  font-size: 1em;
  line-height: 1.5;
}

.sub-title {
  font-size: 0.5em;
  line-height: 20px;
  margin-top: 8px;
}

.join-btn {
  margin-top: 28px;
}
</style>
