<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch, nextTick, onUnmounted } from 'vue'
import Poster from './ProjectPoster.vue'
import PlatformSelector from './platformSelector.vue'
import type { ProjectData } from '@/apis/project'
import type { PlatformConfig } from './platformShare'
import QRCode from 'qrcode'

const props = defineProps<{
    screenshot: File
    projectData: ProjectData
    visible: boolean
}>()

const emit = defineEmits<{
    cancelled: []
    resolved: [platform: string]
}>()

// 组件引用
const posterCompRef = ref<InstanceType<typeof Poster>>()

// 平台相关状态
const selectedPlatform = ref<PlatformConfig | null>(null)
const jumpUrl = ref<string>('')
const qrCodeData = ref<string>('')
const isGeneratingQR = ref(false)

// 清理 object URLs
const createdObjectUrls = new Set<string>()
</script>

<template>
</template>

<style lang="scss" scoped>
</style>