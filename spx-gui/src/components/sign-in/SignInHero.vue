<script setup lang="ts">
defineProps<{
  heroSrc: string
}>()
</script>

<template>
  <section class="sign-in-hero">
    <h1 class="title">{{ $t({ en: 'Sign in', zh: '登录' }) }}</h1>
    <div class="illustration-frame">
      <img class="illustration" :src="heroSrc" alt="" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.sign-in-hero {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 600px;
  padding: 72px 28px 48px 36px;
}

.title {
  margin: 0;
  color: #24292f;
  font-family: 'PingFang SC', 'HarmonyOS Sans SC', 'Noto Sans SC', sans-serif;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.15;
}

.illustration-frame {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 12px 0 0;
}

.illustration {
  width: min(100%, 472px);
  height: auto;
  user-select: none;
}

@media (max-width: 960px) {
  .sign-in-hero {
    min-height: auto;
    gap: 24px;
    padding: 32px 24px 0;
  }

  .title {
    font-size: 24px;
  }

  .illustration {
    max-width: 360px;
  }
}
</style>
