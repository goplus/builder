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
    resolved: [platfrom: string]
}>()

</script>

<template>
</template>

<style lang="scss" scoped>
</style>