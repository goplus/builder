<script setup lang="ts">
import { UIButton } from '@/components/ui'

defineProps<{
  logoSrc: string
  wechatIconSrc: string
  qqIconSrc: string
  loading: null | 'wechat' | 'qq' | 'password'
}>()

defineEmits<{
  wechat: []
  qq: []
  password: []
}>()
</script>

<template>
  <section class="sign-in-panel">
    <div class="brand-block">
      <div class="logo-shell">
        <img class="logo" :src="logoSrc" alt="" />
      </div>
      <div class="brand-name">XBuilder</div>
    </div>

    <div class="actions">
      <div class="primary-actions">
        <UIButton
          data-testid="sign-in-wechat"
          class="action wechat"
          color="primary"
          size="large"
          variant="flat"
          :loading="loading === 'wechat'"
          @click="$emit('wechat')"
        >
          <template #icon>
            <img class="icon" :src="wechatIconSrc" alt="" />
          </template>
          {{ $t({ en: 'Use WeChat to sign in', zh: '使用微信登录' }) }}
        </UIButton>

        <UIButton
          data-testid="sign-in-qq"
          class="action qq"
          color="white"
          size="large"
          variant="stroke"
          :loading="loading === 'qq'"
          @click="$emit('qq')"
        >
          <template #icon>
            <img class="icon" :src="qqIconSrc" alt="" />
          </template>
          {{ $t({ en: 'Use QQ to sign in', zh: '使用 QQ 登录' }) }}
        </UIButton>
      </div>

      <button
        data-testid="sign-in-password"
        class="password"
        type="button"
        :disabled="loading === 'password'"
        @click="$emit('password')"
      >
        <span>{{ $t({ en: 'Sign in with username and password', zh: '用户名密码登录' }) }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.sign-in-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 64px;
  min-height: 600px;
  padding: 72px 84px;
  border-left: 1px solid #e0e7ef;
}

.brand-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.logo-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 7px;
  background: #24292f;
}

.logo {
  width: 23px;
  height: 22px;
}

.brand-name {
  color: #24292f;
  font-family: 'HarmonyOS Sans', 'PingFang SC', 'Noto Sans SC', sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 28px;
  align-items: center;
  width: min(100%, 330px);
}

.primary-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.action {
  width: 100%;
  --ui-button-height: 48px;
  --ui-button-radius: 8px;
  --ui-button-gap: 12px;
}

.action :deep(.content) {
  font-family: 'PingFang SC', 'HarmonyOS Sans SC', 'Noto Sans SC', sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
}

.wechat {
  --ui-button-bg-color: #0bc0cf;
  --ui-button-shadow-color: #0bc0cf;
}

.wechat :deep(.content) {
  color: #ffffff;
}

.qq {
  --ui-button-bg-color: #ffffff;
  --ui-button-color: #24292f;
  --ui-button-stroke-color: #eaeff3;
}

.icon {
  display: block;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
}

.password {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: none;
  color: #6e7781;
  font-family: 'PingFang SC', 'HarmonyOS Sans SC', 'Noto Sans SC', sans-serif;
  font-size: 16px;
  line-height: 24px;
  cursor: pointer;

  &::after {
    content: '';
    display: block;
    width: 8px;
    height: 8px;
    margin-top: 1px;
    border-top: 1.75px solid currentColor;
    border-right: 1.75px solid currentColor;
    transform: rotate(45deg);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }
}

@media (max-width: 960px) {
  .sign-in-panel {
    min-height: auto;
    gap: 40px;
    padding: 40px 24px 48px;
    border-left: none;
    border-top: 1px solid #e0e7ef;
  }

  .actions {
    width: 100%;
    max-width: 360px;
  }
}
</style>
