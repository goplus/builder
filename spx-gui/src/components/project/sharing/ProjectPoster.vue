<script setup lang="ts"> // expose、defineExpose需要在setup内执行
import type { ProjectData } from '@/apis/project'
import html2canvas from 'html2canvas'
import { ref, nextTick, computed, onMounted, watch } from 'vue'
import { UIIcon } from '@/components/ui'
import logo from './logos/XBuilderLogo.svg'
import PosterBackground from './postBackground.jpg'
import { universalUrlToWebUrl } from '@/models/common/cloud'
import { useExternalUrl } from '@/utils/utils'
import QRCode from 'qrcode'

const props = defineProps<{
  img?: File
  projectData: ProjectData
}>()

const createPoster = async (): Promise<File> => {

}

defineExpose({
  createPoster
})
</script>

<template>
</template>

<style scoped lang="scss">
</style>