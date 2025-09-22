<template>
  <section ref="wrapperRef" class="img-preview" :style="wrapperStyle">
    <canvas ref="canvasRef" class="canvas"></canvas>
  </section>
</template>

<script lang="ts" setup>
import { computed, effect, ref } from 'vue'
import { useFileImg } from '@/utils/file'
import { useContentSize } from '@/utils/dom'
import { getImgDrawingCtx } from '@/utils/canvas'
import type { File } from '@/models/common/file'

const props = defineProps<{
  file: File
  /**
   * If there are more than one images in total.
   * If true, the size for every `ImgPreview` will be smaller.
   */
  multiple: boolean
}>()

const wrapperStyle = computed(() => ({
  // If there are no other images, the `ImgPreview` fills the outer wrapper.
  // If there are other images, the `ImgPreview` will use the height of its content, which is calculated dynamically.
  height: props.multiple ? 'auto' : '100%'
}))
const wrapperRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const [imgRef] = useFileImg(() => props.file)

const wrapperSize = useContentSize(wrapperRef)
const maxWidthRef = computed(() => wrapperSize.width.value)
const maxHeightRef = computed(() => {
  if (props.multiple) return 230 // px
  return wrapperSize.height.value
})

effect(() => {
  const maxWidth = maxWidthRef.value
  const maxHeight = maxHeightRef.value
  const canvas = canvasRef.value
  const img = imgRef.value
  if (maxWidth == null || maxHeight == null || canvas == null || img == null) return
  // adjust canvas size to fir max width/height & keep same ratio with img
  const scaleX = maxWidth / img.naturalWidth
  const scaleY = maxHeight / img.naturalHeight
  const scale = Math.min(scaleX, scaleY)
  canvas.style.width = `${img.naturalWidth * scale}px`
  canvas.style.height = `${img.naturalHeight * scale}px`
})

effect(() => {
  const [canvas, img] = [canvasRef.value, imgRef.value]
  if (canvas == null || img == null) return
  // draw image on canvas
  const ctx = getImgDrawingCtx(canvas)
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)
})

defineExpose({
  getCanvas() {
    return canvasRef.value
  }
})
</script>

<style lang="scss" scoped>
.img-preview {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  & + .img-preview {
    margin-top: 20px;
  }
}

.canvas {
  background: left bottom repeat url('./img-bg.svg');
}
</style>
