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

const posterElementRef = ref<HTMLElement>()

const createPoster = async (): Promise<File> => {
  if (!posterElementRef.value || !props.projectData) {
    throw new Error('Poster element not ready or project data is undefined')
  }

  await nextTick() // 确保 DOM 已经更新

  const canvas = await html2canvas(posterElementRef.value, {
    width: 600,
    height: 800
  })

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b: Blob | null) => resolve(b), 'image/png')
  )

  if (!blob) throw new Error('Failed to generate poster')

  return new File([blob], `${props.projectData.name}-poster.png`, { type: 'image/png' })
}

defineExpose({
  createPoster
})
</script>

<template>
</template>

<style scoped lang="scss">
</style>