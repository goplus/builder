<template>
  <UIConfirmDialog
    :visible="visible"
    type="warning"
    :title="$t({ en: 'New Version Available', zh: '版本更新' })"
    :content="
      $t({
        en: 'A new version is available. Please save your work and reload the page.',
        zh: '应用已更新，请保存好正在编辑的内容后，刷新页面以体验最新功能和改进'
      })
    "
    :cancel-text="$t({ en: 'Later', zh: '稍后' })"
    :confirm-text="$t({ en: 'Reload Now', zh: '立即刷新' })"
    :confirm-handler="handleReload"
    @cancelled="handleRemindLater"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import UIConfirmDialog from '@/components/ui/dialog/UIConfirmDialog.vue'
import { reloadApp, startUpdateChecker, stopUpdateChecker } from './update-checker'

const visible = ref(false)

const REMIND_LATER_DELAY_MS = 5 * 60 * 1000 // 5 minutes
let laterTimer: ReturnType<typeof setTimeout> | null = null

function show() {
  if (laterTimer != null) {
    return
  }
  visible.value = true
}

function hide() {
  visible.value = false
}

function handleReload() {
  reloadApp()
}

function handleRemindLater() {
  hide()
  laterTimer = setTimeout(() => {
    laterTimer = null
    show()
  }, REMIND_LATER_DELAY_MS)
}

onMounted(() => {
  startUpdateChecker(60 * 1000, show)
})

onUnmounted(() => {
  stopUpdateChecker()
  if (laterTimer != null) {
    clearTimeout(laterTimer)
    laterTimer = null
  }
})
</script>
