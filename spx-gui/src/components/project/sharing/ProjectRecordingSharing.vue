<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch, nextTick, onUnmounted } from 'vue'
import { useExternalUrl } from '@/utils/utils'
import PlatformSelector from './platformSelector.vue'
import type { RecordingData } from '../apis/recording'
import type { PlatformConfig } from './platformShare'
import { SocialPlatformConfigs } from './platformShare'
import QRCode from 'qrcode'

const props = defineProps<{
    recording: Promise<RecordingData>,
    video?: File
    visible: boolean
}>()

type SharingResult = {
    type: 'shared'
    platform: string
} | {
    type: 'rerecord'
}
const emit = defineEmits<{
    cancelled: []
    resolved: [result: SharingResult]
}>()

const currentRecording = ref<RecordingData | null>(null)

// 组件状态
const selectedPlatform = ref<PlatformConfig | null>(null)
const jumpUrl = ref<string>('')
const qrCodeData = ref<string>('')
const isGeneratingQR = ref(false)
const isSharing = ref(false)

// 清理 object URLs
const createdObjectUrls = new Set<string>()
</script>

<template>
</template>

<style lang="scss" scoped>
</style>
