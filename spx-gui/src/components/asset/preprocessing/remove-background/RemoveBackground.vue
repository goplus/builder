<template>
  <ProcessDetail v-show="active" :applied="applied" :apply-fn="apply" :cancel-fn="cancel">
    <template #header>
      {{ $t({ en: 'Remove background', zh: '去除背景' }) }}
    </template>
    <ImgPreview v-for="(file, i) in input" ref="imgPreviewRefs" :key="i" :file="file" :multiple="input.length > 1" />
  </ProcessDetail>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { loadImg } from '@/utils/dom'
import { extname, stripExt } from '@/utils/path'
import { memoizeAsync } from '@/utils/utils'
import { getMimeFromExt } from '@/utils/file'
import { toJpeg } from '@/utils/img'
import { getImgDrawingCtx } from '@/utils/canvas'
import { matting } from '@/apis/aigc'
import { fromBlob, toNativeFile, File } from '@/models/common/file'
import { createFileWithWebUrl, saveFileForWebUrl } from '@/models/common/cloud'
import type { MethodComponentEmits, MethodComponentProps } from '../common/types'
import ProcessDetail from '../common/ProcessDetail.vue'
import ImgPreview from '../common/ImgPreview.vue'

const props = defineProps<MethodComponentProps>()
const emit = defineEmits<MethodComponentEmits>()

const getUrls = memoizeAsync((files: File[]) =>
  Promise.all(
    files.map(async (file) => {
      file = await adaptImg(file)
      return saveFileForWebUrl(file)
    })
  )
)
const imgPreviewRefs = ref<Array<InstanceType<typeof ImgPreview>>>([])

const batchRemoveBackground = memoizeAsync(
  async (inputUrls: string[]) => {
    return Promise.all(inputUrls.map((url) => matting(url)))
  },
  (urls) => urls.join(',')
)

async function apply() {
  const inputUrls = await getUrls(props.input)
  const outputUrls = await batchRemoveBackground(inputUrls)
  await drawTransitions(outputUrls)
  const outputFiles = outputUrls.map((url, index) => {
    const name = stripExt(props.input[index].name) + extname(url)
    return createFileWithWebUrl(url, name)
  })
  emit('applied', outputFiles)
}

async function cancel() {
  const inputUrls = await getUrls(props.input)
  await drawTransitions(inputUrls, true)
  emit('cancel')
}

async function drawTransitions(urls: string[], reverse = false) {
  await Promise.all(
    urls.map(async (url, i) => {
      const imgPreview = imgPreviewRefs.value[i]
      const canvas = imgPreview.getCanvas()
      if (canvas == null) return
      const img = await loadImg(url)
      await drawTransition(canvas, img, reverse)
    })
  )
}

function drawTransition(canvas: HTMLCanvasElement, target: HTMLImageElement, reverse = false) {
  const duration = 500 // ms
  return new Promise<void>((resolve) => {
    let startAt: number
    function onFrame(now: number) {
      if (startAt == null) startAt = now
      const progress = Math.min((now - startAt) / duration, 1)
      drawTransitionFrame(canvas, target, progress, reverse)
      if (progress >= 1) return resolve()
      requestAnimationFrame(onFrame)
    }
    requestAnimationFrame(onFrame)
  })
}

function drawTransitionFrame(
  canvas: HTMLCanvasElement,
  target: HTMLImageElement,
  /** Progress, number in range `[0, 1]` */
  progress: number,
  reverse: boolean
) {
  const ctx = getImgDrawingCtx(canvas)
  if (reverse) {
    ctx.clearRect(canvas.width * (1 - progress), 0, canvas.width * progress, canvas.height)
    ctx.drawImage(
      target,
      target.naturalWidth * (1 - progress),
      0,
      target.naturalWidth * progress,
      target.naturalHeight,
      canvas.width * (1 - progress),
      0,
      canvas.width * progress,
      canvas.height
    )
  } else {
    ctx.clearRect(0, 0, canvas.width * progress, canvas.height)
    ctx.drawImage(
      target,
      0,
      0,
      target.naturalWidth * progress,
      target.naturalHeight,
      0,
      0,
      canvas.width * progress,
      canvas.height
    )
  }
}

/** Adapt image file to fit AIGC matting. Unsupported image files will be converted to jpeg. */
async function adaptImg(file: File): Promise<File> {
  /** Image file formats supported by AIGC matting */
  const supportedImgExts = ['jpg', 'jpeg', 'png']
  for (const ext of supportedImgExts) {
    if (file.type === getMimeFromExt(ext)) return file
  }
  const jpegBlob = await toJpeg(await toNativeFile(file))
  const jpegFileName = stripExt(file.name) + '.jpeg'
  return fromBlob(jpegFileName, jpegBlob)
}
</script>
