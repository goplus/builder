<template>
  <div class="update-notification-provider">
    <div v-if="visible" class="notification" role="status" aria-live="polite">
      <div class="message">
        <DotLottieVue class="icon" autoplay loop :src="notificationIconUrl" />
        {{
          $t({
            en: 'A new version of XBuilder is available. Reload to get the latest features and improvements.',
            zh: 'XBuilder 新版本已发布，刷新页面即可体验最新功能和改进。'
          })
        }}
      </div>
      <UIButton
        v-radar="{ name: 'Reload now', desc: 'Reload the page to use the latest version' }"
        variant="flat"
        color="yellow"
        size="small"
        @click="handleReload"
      >
        {{ $t({ en: 'Reload now', zh: '立即刷新' }) }}
      </UIButton>
    </div>
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import UIButton from '@/components/ui/UIButton.vue'
import { UpdateChecker } from './update-checker'
import notificationIconUrl from './notification.lottie?url'

const visible = ref(false)

const checker = new UpdateChecker()

function show() {
  visible.value = true
}

function handleReload() {
  window.location.reload()
}

onMounted(() => {
  checker.start(60 * 1000, show)
})

onUnmounted(() => {
  checker.stop()
})
</script>

<style lang="scss" scoped>
.update-notification-provider {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.notification {
  flex: 0 0 auto;
  padding: 11px 24px;
  background-color: var(--ui-color-yellow-200);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  color: var(--ui-color-grey-900);

  .message {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    line-height: 22px;

    .icon {
      width: 24px;
      height: 24px;
    }
  }
}

.content {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
