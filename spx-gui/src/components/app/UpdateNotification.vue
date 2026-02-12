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
    @cancelled="handleCancel"
    @resolved="handleReload"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import UIConfirmDialog from '@/components/ui/dialog/UIConfirmDialog.vue'
import { reloadApp, startUpdateChecker, stopUpdateChecker } from './update-checker'

const visible = ref(false)

function show() {
  visible.value = true
}

function hide() {
  visible.value = false
}

function handleReload() {
  reloadApp()
}

function handleCancel() {
  hide()
}

onMounted(() => {
  startUpdateChecker(60 * 1000, show)
})

onUnmounted(() => {
  stopUpdateChecker()
})
</script>
