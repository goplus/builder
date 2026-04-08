<template>
  <div class="h-full min-h-0 flex flex-col">
    <div
      v-if="visible"
      class="flex-none flex items-center justify-center gap-6 bg-yellow-200 px-6 py-2.75 text-grey-900"
      role="status"
      aria-live="polite"
    >
      <div class="flex items-center gap-3 text-body text-grey-900">
        <DotLottieVue class="h-6 w-6" autoplay loop :src="notificationIconUrl" />
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
    <div class="flex-auto min-h-0">
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
  checker.stop()
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
