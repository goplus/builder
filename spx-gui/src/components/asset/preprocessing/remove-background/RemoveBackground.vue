<template>
  <ProcessDetail v-show="active" :applied="applied" :apply-fn="apply" :cancel-fn="cancel">
    <template #header>
      {{ $t({ en: 'Remove background', zh: '去除背景' }) }}
    </template>
    <ImgPreview v-for="(file, i) in input" ref="imgPreviewRefs" :key="i" :file="file" :multiple="input.length > 1" />
  </ProcessDetail>
</template>

<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import { loadImg } from '@/utils/dom'
import { extname, stripExt } from '@/utils/path'
import { memoizeAsync } from '@/utils/utils'
import { getMimeFromExt } from '@/utils/file'
import { toJpeg } from '@/utils/img'
import { getImgDrawingCtx } from '@/utils/canvas'
import { taskRemoveBackgroundSupportedImgExts, TaskType } from '@/apis/aigc'
import { createFileWithUniversalUrl, saveFile } from '@/models/common/cloud'
import { fromBlob, toNativeFile, File } from '@/models/common/file'
import { Task } from '@/models/gen/common'
import type { MethodComponentEmits, MethodComponentProps } from '../common/types'
import ProcessDetail from '../common/ProcessDetail.vue'
import ImgPreview from '../common/ImgPreview.vue'

const props = defineProps<MethodComponentProps>()
const emit = defineEmits<MethodComponentEmits>()

const imgPreviewRefs = ref<Array<InstanceType<typeof ImgPreview>>>([])

const removeBackground = memoizeAsync(async (inputFile: File, signal?: AbortSignal) => {
  inputFile = await adaptImgForBackgroundRemoval(inputFile)
  const universalUrl = await saveFile(inputFile, signal)
  const task = new Task(TaskType.RemoveBackground)
  signal?.addEventListener('abort', () => task.tryCancel(), { once: true })
  try {
    await task.start({ imageUrl: universalUrl })
    const { imageUrl: resultUniversalUrl } = await task.untilCompleted()
    const name = stripExt(inputFile.name) + extname(resultUniversalUrl)
    return createFileWithUniversalUrl(resultUniversalUrl, name)
  } finally {
    task.dispose()
  }
})

let applyingCtrl: AbortController | null = null
function clearApplying() {
  applyingCtrl?.abort()
  applyingCtrl = null
}
onScopeDispose(clearApplying)

async function apply() {
  clearApplying()
  const ctrl = (applyingCtrl = new AbortController())
  const outputFiles = await Promise.all(props.input.map((file) => removeBackground(file, ctrl.signal)))
  ctrl.signal.throwIfAborted()
  await drawTransitions(outputFiles, false, ctrl.signal)
  ctrl.signal.throwIfAborted()
  emit('applied', outputFiles)
}

async function cancel() {
  clearApplying()
  await drawTransitions(props.input, true)
  emit('cancel')
}

async function drawTransitions(files: File[], reverse: boolean, signal?: AbortSignal) {
  await Promise.all(
    files.map(async (file, i) => {
      const imgPreview = imgPreviewRefs.value[i]
      const canvas = imgPreview.getCanvas()
      if (canvas == null) return
      const url = await file.url((fn) => signal?.addEventListener('abort', fn, { once: true }))
      signal?.throwIfAborted()
      const img = await loadImg(url)
      signal?.throwIfAborted()
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

/** Adapt image file to fit AIGC remove background. Unsupported image files will be converted to jpeg. */
async function adaptImgForBackgroundRemoval(file: File): Promise<File> {
  /** Image file formats supported by AIGC remove background */
  for (const ext of taskRemoveBackgroundSupportedImgExts) {
    if (file.type === getMimeFromExt(ext)) return file
  }
  const jpegBlob = await toJpeg(await toNativeFile(file))
  const jpegFileName = stripExt(file.name) + '.jpeg'
  return fromBlob(jpegFileName, jpegBlob)
}
</script>
