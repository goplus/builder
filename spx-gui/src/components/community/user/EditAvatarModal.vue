<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Cropper from 'cropperjs'
import { type User } from '@/apis/user'
import { fromBlob } from '@/models/common/file'
import { saveFile } from '@/models/common/cloud'
import { UIButton, UIFormModal } from '@/components/ui'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useUpdateSignedInUser } from '@/stores/user'
import AvatarZoomSlider from './AvatarZoomSlider.vue'

const avatarSize = 512
const maxAvatarFileSize = 5 * 1024 * 1024
const selectionCoverage = 1
const zoomMin = 1
const zoomMax = 3
const zoomSliderStep = 0.01
const zoomButtonStep = 0.1
const zoomWheelFactor = 0.001
const layoutSettleTolerance = 0.5
const layoutSettleStableFrames = 2
const layoutSettleMaxFrames = 30
const imageCoverTolerance = 0.5

type CropperImageElement = HTMLElement & {
  $center(): CropperImageElement
  $ready(): Promise<HTMLImageElement>
  $resetTransform(): CropperImageElement
  $scale(scale: number): CropperImageElement
  $setTransform(matrix: number[]): CropperImageElement
  $zoom(scale: number): CropperImageElement
}

type CropperTransformEvent = CustomEvent<{
  matrix: number[]
}>

const cropperTemplate = `
  <cropper-canvas>
    <cropper-image rotatable scalable translatable></cropper-image>
    <cropper-shade hidden></cropper-shade>
    <cropper-selection initial-coverage="${selectionCoverage}">
      <cropper-handle action="move" plain></cropper-handle>
    </cropper-selection>
  </cropper-canvas>
`

const props = defineProps<{
  file: globalThis.File
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [user: User]
}>()

const cropperHostRef = ref<HTMLDivElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const sourceUrlRef = ref('')
const cropperRef = ref<Cropper | null>(null)
const cropperImageRef = ref<CropperImageElement | null>(null)
const isImageLoadedRef = ref(false)
const zoomValueRef = ref(zoomMin)
const isReady = computed(() => cropperRef.value != null)
let unbindImageCoverClamp: (() => void) | null = null

watch(
  () => props.file,
  (file, _, onCleanup) => {
    isImageLoadedRef.value = false
    const sourceUrl = URL.createObjectURL(file)
    sourceUrlRef.value = sourceUrl
    onCleanup(() => {
      sourceUrlRef.value = ''
      URL.revokeObjectURL(sourceUrl)
    })
  },
  { immediate: true }
)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      destroyCropper()
      return
    }
    if (!isImageLoadedRef.value) return
    await initializeCropper()
  }
)

onBeforeUnmount(() => {
  destroyCropper()
})

function waitForFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function isLayoutSettled(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false

  return (
    Math.abs(rect.width - element.offsetWidth) <= layoutSettleTolerance &&
    Math.abs(rect.height - element.offsetHeight) <= layoutSettleTolerance
  )
}

async function waitForSettledLayout(element: HTMLElement) {
  let stableFrames = 0

  for (let i = 0; i < layoutSettleMaxFrames; i += 1) {
    if (isLayoutSettled(element)) {
      stableFrames += 1
      if (stableFrames >= layoutSettleStableFrames) return
    } else {
      stableFrames = 0
    }

    await waitForFrame()
  }
}

function destroyCropper() {
  unbindImageCoverClamp?.()
  unbindImageCoverClamp = null
  cropperImageRef.value = null
  cropperRef.value?.destroy()
  cropperRef.value = null
  zoomValueRef.value = zoomMin
}

function isMatrixEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) <= imageCoverTolerance)
}

function getRectWithMatrix(image: CropperImageElement, matrix: number[]) {
  const previousTransform = image.style.transform
  image.style.transform = `matrix(${matrix.join(', ')})`
  const rect = image.getBoundingClientRect()
  image.style.transform = previousTransform
  return rect
}

function clampImageMatrixToCanvas(image: CropperImageElement, canvas: HTMLElement, matrix: number[]) {
  const imageRect = getRectWithMatrix(image, matrix)
  const canvasRect = canvas.getBoundingClientRect()
  const nextMatrix = [...matrix]

  if (imageRect.width > canvasRect.width + imageCoverTolerance) {
    if (imageRect.left > canvasRect.left + imageCoverTolerance) {
      nextMatrix[4] += canvasRect.left - imageRect.left
    } else if (imageRect.right < canvasRect.right - imageCoverTolerance) {
      nextMatrix[4] += canvasRect.right - imageRect.right
    }
  } else {
    nextMatrix[4] += canvasRect.left + (canvasRect.width - imageRect.width) / 2 - imageRect.left
  }

  if (imageRect.height > canvasRect.height + imageCoverTolerance) {
    if (imageRect.top > canvasRect.top + imageCoverTolerance) {
      nextMatrix[5] += canvasRect.top - imageRect.top
    } else if (imageRect.bottom < canvasRect.bottom - imageCoverTolerance) {
      nextMatrix[5] += canvasRect.bottom - imageRect.bottom
    }
  } else {
    nextMatrix[5] += canvasRect.top + (canvasRect.height - imageRect.height) / 2 - imageRect.top
  }

  return nextMatrix
}

function bindImageCoverClamp(cropperImage: CropperImageElement, cropperCanvas: HTMLElement) {
  let isClamping = false

  const handleTransform = (event: Event) => {
    if (isClamping) return

    const matrix = (event as CropperTransformEvent).detail?.matrix
    if (!Array.isArray(matrix) || matrix.length !== 6) return

    const nextMatrix = clampImageMatrixToCanvas(cropperImage, cropperCanvas, matrix)
    if (isMatrixEqual(nextMatrix, matrix)) return

    event.preventDefault()
    isClamping = true
    cropperImage.$setTransform(nextMatrix)
    isClamping = false
  }

  cropperImage.addEventListener('transform', handleTransform as EventListener)

  return () => {
    cropperImage.removeEventListener('transform', handleTransform as EventListener)
  }
}

async function initializeCoverImage(
  cropperImage: CropperImageElement,
  cropperCanvas: HTMLElement,
  sourceImage: HTMLImageElement
) {
  cropperImage.style.width = `${sourceImage.naturalWidth}px`
  cropperImage.style.height = `${sourceImage.naturalHeight}px`
  await cropperImage.$ready()
  cropperImage.$resetTransform()

  const { width, height } = cropperCanvas.getBoundingClientRect()
  const scale = Math.max(width / sourceImage.naturalWidth, height / sourceImage.naturalHeight)
  cropperImage.$scale(scale)
  cropperImage.$center()
}

function expectCropperPart<T>(value: T | null, error: DefaultException) {
  if (value == null) throw error
  return value
}

async function initializeCropper() {
  await nextTick()
  destroyCropper()

  const host = cropperHostRef.value
  const image = imageRef.value
  if (!props.visible || !isImageLoadedRef.value || host == null || image == null) return

  await waitForSettledLayout(host)
  if (!props.visible || !isImageLoadedRef.value || host !== cropperHostRef.value || image !== imageRef.value) return

  const cropper = new Cropper(image, {
    container: host,
    template: cropperTemplate
  })

  try {
    const selection = expectCropperPart(
      cropper.getCropperSelection(),
      new DefaultException({ en: 'Failed to initialize avatar cropper', zh: '初始化头像裁剪器失败' })
    )
    selection.aspectRatio = 1
    selection.initialAspectRatio = 1
    selection.initialCoverage = selectionCoverage

    const cropperCanvas = expectCropperPart(
      cropper.getCropperCanvas(),
      new DefaultException({ en: 'Avatar cropper canvas is not ready', zh: '头像裁剪画布尚未就绪' })
    )
    cropperCanvas.scaleStep = 0

    const cropperImage = expectCropperPart(
      cropper.getCropperImage() as CropperImageElement | null,
      new DefaultException({ en: 'Avatar cropper image is not ready', zh: '头像裁剪图片尚未就绪' })
    )

    await initializeCoverImage(cropperImage, cropperCanvas, image)
    cropperImageRef.value = cropperImage
    unbindImageCoverClamp = bindImageCoverClamp(cropperImage, cropperCanvas)
    zoomValueRef.value = zoomMin
    cropperRef.value = cropper
  } catch (error) {
    cropper.destroy()
    throw error
  }
}

function getSelection() {
  const selection = cropperRef.value?.getCropperSelection()
  if (selection == null) {
    throw new DefaultException({ en: 'Avatar cropper is not ready', zh: '头像裁剪器尚未就绪' })
  }
  return selection
}

function getImage() {
  const image = cropperImageRef.value
  if (image == null) {
    throw new DefaultException({ en: 'Avatar cropper image is not ready', zh: '头像裁剪图片尚未就绪' })
  }
  return image
}

function normalizeZoom(value: number) {
  return Math.min(zoomMax, Math.max(zoomMin, Number(value.toFixed(2))))
}

function toZoomDelta(scaleRatio: number) {
  return scaleRatio >= 1 ? scaleRatio - 1 : 1 - 1 / scaleRatio
}

function normalizeWheelDelta(event: WheelEvent) {
  switch (event.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return event.deltaY * 16
    case WheelEvent.DOM_DELTA_PAGE:
      return event.deltaY * 120
    default:
      return event.deltaY
  }
}

function setZoomValue(value: number) {
  if (!isReady.value || handleConfirm.isLoading.value) return

  const currentZoomValue = zoomValueRef.value
  const nextZoomValue = normalizeZoom(value)
  if (nextZoomValue === currentZoomValue) return

  const scaleRatio = nextZoomValue / currentZoomValue
  getImage().$zoom(toZoomDelta(scaleRatio))
  zoomValueRef.value = nextZoomValue
}

function handleWheelZoom(event: WheelEvent) {
  if (!isReady.value || handleConfirm.isLoading.value) return

  event.preventDefault()
  const wheelDelta = -normalizeWheelDelta(event) * zoomWheelFactor
  const zoomDelta = Math.min(zoomButtonStep, Math.max(-zoomButtonStep, wheelDelta))
  if (zoomDelta === 0) return

  setZoomValue(zoomValueRef.value + zoomDelta)
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob == null) {
        reject(new DefaultException({ en: 'Failed to export avatar image', zh: '导出头像图片失败' }))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

const updateProfile = useUpdateSignedInUser()

const handleConfirm = useMessageHandle(
  async () => {
    const canvas = await getSelection().$toCanvas({
      width: avatarSize,
      height: avatarSize
    })
    const blob = await canvasToBlob(canvas)
    if (blob.size > maxAvatarFileSize) {
      throw new DefaultException({
        en: 'Avatar image must be 5 MiB or smaller',
        zh: '头像图片不能超过 5 MiB'
      })
    }
    const avatar = await saveFile(fromBlob('avatar.png', blob))
    const updated = await updateProfile({ avatar })
    if (!props.visible) return
    emit('resolved', updated)
  },
  { en: 'Failed to update avatar', zh: '更新头像失败' }
)

function handleCancel() {
  if (handleConfirm.isLoading.value) return
  emit('cancelled')
}

const handleImageLoadError = useMessageHandle(() => {
  handleCancel()
  throw new DefaultException({
    en: 'Failed to load the selected avatar image',
    zh: '加载所选头像图片失败'
  })
})

async function handleImageLoad() {
  isImageLoadedRef.value = true
  if (!props.visible) return
  await initializeCropper()
}
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Edit avatar modal', desc: 'Modal for editing user avatar' }"
    :title="$t({ en: 'Edit avatar', zh: '编辑头像' })"
    :style="{ width: '560px' }"
    :mask-closable="!handleConfirm.isLoading.value"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <div
      ref="cropperHostRef"
      class="cropper-host mx-auto aspect-square w-91.5 overflow-hidden bg-grey-300"
      :class="{ disabled: handleConfirm.isLoading.value }"
      @wheel.prevent="handleWheelZoom"
    >
      <img ref="imageRef" class="hidden" :src="sourceUrlRef" @load="handleImageLoad" @error="handleImageLoadError.fn" />
    </div>

    <AvatarZoomSlider
      class="mx-auto mt-2.5"
      :value="zoomValueRef"
      :min="zoomMin"
      :max="zoomMax"
      :step="zoomSliderStep"
      :button-step="zoomButtonStep"
      :disabled="!isReady || handleConfirm.isLoading.value"
      @update:value="setZoomValue"
    />

    <footer class="mt-10 flex justify-end">
      <div class="flex items-center gap-5">
        <UIButton
          v-radar="{ name: 'Cancel edit avatar button', desc: 'Click to cancel editing avatar' }"
          type="neutral"
          :disabled="handleConfirm.isLoading.value"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Confirm edit avatar button', desc: 'Click to save avatar changes' }"
          type="primary"
          :disabled="!isReady"
          :loading="handleConfirm.isLoading.value"
          @click="handleConfirm.fn"
        >
          {{ $t({ en: 'Confirm', zh: '确认' }) }}
        </UIButton>
      </div>
    </footer>
  </UIFormModal>
</template>

<style scoped>
.cropper-host {
}

.cropper-host.disabled {
  pointer-events: none;
  opacity: 0.9;
}

.cropper-host:deep(cropper-canvas) {
  width: 100%;
  height: 100%;
}

.cropper-host:deep(cropper-selection) {
  z-index: 1;
  border-radius: 50%;
  overflow: hidden;
  border: 1.22px dashed rgb(255 255 255 / 100%);
  box-sizing: border-box;
  box-shadow: 0 0 0 999px rgb(from var(--ui-color-grey-300) r g b / 32%);
}
</style>
