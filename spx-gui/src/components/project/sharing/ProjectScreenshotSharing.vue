<script setup lang="ts">
// import { ref } from 'vue'
// import { computed, watch, nextTick, onUnmounted } from 'vue'
// import Poster from './ProjectPoster.vue'
// import PlatformSelector from './PlatformSelector.vue'
import type { ProjectData } from '@/apis/project'
// import type { PlatformConfig } from './platform-share'
// import QRCode from 'qrcode'

defineProps<{
  screenshot: File
  projectData: ProjectData
  visible: boolean
}>()

defineEmits<{
  cancelled: []
  resolved: [platform: string]
}>()

// 组件引用
// const posterCompRef = ref<InstanceType<typeof Poster>>()

// 平台相关状态
// const selectedPlatform = ref<PlatformConfig | null>(null)
// const jumpUrl = ref<string>('')
// const qrCodeData = ref<string>('')
// const isGeneratingQR = ref(false)

// 清理 object URLs
// const createdObjectUrls = new Set<string>()
</script>

<template>
  <div>Project Screenshot Sharing - TODO</div>
</template>

<style lang="scss" scoped></style>
