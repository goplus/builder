<template>
  <div class="container">
    <div class="image-container">
      <div
        v-if="imgSrc && !imgLoading"
        class="backdrop-preview"
        :class="{ dragging }"
        @wheel="handleWheel"
        @dragstart.prevent
        @mousedown="handleMouseDown"
      >
        <div
          class="backdrop-preview-img"
          role="img"
          aria-label="backdrop preview"
          :style="{
            '--img-src': `url(${imgSrc})`,
            '--scale': scale,
            '--translate-x': `${translateX}px`,
            '--translate-y': `${translateY}px`
          }"
        ></div>
        <PreviewController
          class="preview-controller"
          @zoom-in="handleZoomIn"
          @zoom-out="handleZoomOut"
          @fit="handleFit"
        />
        <div ref="scaleInfo" class="scale-info">
          {{ $t({ en: 'Scale', zh: '缩放' }) }}: {{ scale.toFixed(1) }}x
        </div>
      </div>
      <UILoading v-if="imgLoading" class="backdrop-preview-loading" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AssetData, AssetType } from '@/apis/asset'
import { UILoading } from '@/components/ui'
import { cachedConvertAssetData } from '@/models/common/asset'
import { useFileUrl } from '@/utils/file'
import { useAsyncComputed } from '@/utils/utils'
import { onMounted, onUnmounted, ref } from 'vue'
import PreviewController from './PreviewController.vue'

const props = defineProps<{
  asset: AssetData<AssetType.Backdrop>
}>()

const backdrop = useAsyncComputed(() => {
  return cachedConvertAssetData(props.asset)
})

const [imgSrc, imgLoading] = useFileUrl(() => backdrop.value?.img)

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)

const scaleInfo = ref<HTMLElement | null>(null)
let infoTimer: number

const adjustScale = (delta: number) => {
  scale.value = Math.max(0.1, scale.value + delta)
  scaleInfo.value?.classList.add('active')
  clearTimeout(infoTimer)
  infoTimer = setTimeout(() => {
    scaleInfo.value?.classList.remove('active')
  }, 500) as any
}

const handleZoomIn = () => {
  adjustScale(0.2)
}

const handleZoomOut = () => {
  adjustScale(-0.2)
}

const handleFit = () => {
  adjustScale(1 - scale.value)
  translateX.value = 0
  translateY.value = 0
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  // move horizontally when shift key is pressed
  if (e.shiftKey) {
    translateX.value -= e.deltaY
    return
  }
  // move vertically when alt key is pressed
  if (e.altKey) {
    translateY.value -= e.deltaY
    return
  }
  if (e.deltaY > 0) {
    handleZoomOut()
  } else {
    handleZoomIn()
  }
}

const dragging = ref(false)
const lastX = ref(0)
const lastY = ref(0)

const handleMouseDown = (e: MouseEvent) => {
  dragging.value = true
  lastX.value = e.clientX
  lastY.value = e.clientY
}

const handleMouseMove = (e: MouseEvent) => {
  if (dragging.value) {
    // divide by scale to keep the movement consistent
    // otherwise, the image will move too slow when zoomed out
    translateX.value += (e.clientX - lastX.value) / scale.value
    translateY.value += (e.clientY - lastY.value) / scale.value
    lastX.value = e.clientX
    lastY.value = e.clientY
  }
}

const handleMouseUp = () => {
  dragging.value = false
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style lang="scss" scoped>
.container {
  --container-width: 95%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-container {
  width: var(--container-width);
  height: 0;
  overflow: visible;
  padding-bottom: calc(var(--container-width) * 0.5625);
  position: relative;
}

.backdrop-preview,
.backdrop-preview-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
}

.backdrop-preview {
  overflow: hidden;
  background-color: var(--ui-color-grey-200, #f5f7fa);
  cursor: grab;

  &.dragging {
    cursor: grabbing;
  }
}

.preview-controller {
  position: absolute;
  bottom: 10px;
  right: 10px;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-container:hover .preview-controller {
  opacity: 1;
}

.backdrop-preview-img {
  background-image: var(--img-src);
  width: 100%;
  height: 100%;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  transition: transform 0.2s;
  transform: scale(var(--scale)) translate(var(--translate-x), var(--translate-y));
}

.backdrop-preview.dragging .backdrop-preview-img {
  // prevent lagging when dragging
  transition: none;
}

.scale-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  color: var(--ui-color-grey-800, #4b5563);
  font-size: 14px;
  font-weight: bold;
  background-color: var(--ui-color-grey-100, #ffffff);
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: var(--ui-box-shadow-small);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  user-select: none;
}

.scale-info.active {
  opacity: 0.9;
}
</style>
