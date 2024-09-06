<template>
  <div ref="container" class="container repaint-container">
    <canvas
      ref="drawCanvas"
      class="canvas draw-canvas"
      @mousedown="startDraw"
      @mousemove="drawing"
    ></canvas>
    <canvas ref="imageCanvas" class="canvas image-canvas"></canvas>
  </div>
</template>

<script lang="ts" setup>
import { saveFiles } from '@/models/common/cloud'
import { Disposable } from '@/models/common/disposable'
import { fromBlob } from '@/models/common/file'
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSearchCtx } from '../../SearchContextProvider.vue'
import { InpaintingTask } from '@/models/aigc'
import { client, type UniversalToWebUrlMap } from '@/apis/common'
import {
  AutoFixHighOutlined,
  BackspaceOutlined,
  CancelOutlined,
  CheckFilled,
  DrawOutlined,
  RedoFilled,
  UndoFilled
} from '@vicons/material'
import type { ButtonType } from '@/components/ui/UIButton.vue'
import type { EditorAction } from '../AIPreviewModal.vue'
import { UITextInput, useMessage } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useUndoRedo } from './useUndoRedo'
import BrushSize from './BrushSize.vue'
import { NIcon } from 'naive-ui'
import Erase from '@/components/ui/icons/erase.svg?raw'

const { t } = useI18n()

const props = defineProps<{
  imageSrc: string
}>()

const emit = defineEmits<{
  cancel: []
  resolve: [dataUrl: string]
  loading: [loading: boolean]
}>()

const container = ref<HTMLDivElement | null>(null)
const drawCanvas = ref<HTMLCanvasElement | null>(null)
const imageCanvas = ref<HTMLCanvasElement | null>(null)

let drawCtx: CanvasRenderingContext2D
let imageCtx: CanvasRenderingContext2D

const currentImgData = ref<string>(props.imageSrc)

watch(
  () => props.imageSrc,
  (newSrc) => {
    currentImgData.value = newSrc
    undoRedo.clear()
    undoRedo.setInitial({ img: newSrc })
    drawImage(newSrc)
  }
)

const undoRedo = useUndoRedo<{ img?: string; draw?: string }>()

const resizeCanvas = () => {
  if (!container.value || !drawCanvas.value || !imageCanvas.value) return
  // save and restore the canvas content
  const drawData = drawCtx.canvas.toDataURL()
  const drawImg = new Image()
  drawImg.src = drawData

  const { width, height } = container.value.getBoundingClientRect()
  drawCanvas.value.width = width
  drawCanvas.value.height = height
  imageCanvas.value.width = width
  imageCanvas.value.height = height
  drawImage(currentImgData.value)

  drawImg.onload = () => {
    setTimeout(() => {
      drawCtx.drawImage(drawImg, 0, 0, drawCtx.canvas.width, drawCtx.canvas.height)
    }, 0)
  }
}

const applyUndoRedo = (data: { img?: string; draw?: string }) => {
  if (!drawCtx || !imageCtx) return
  if (data.img) {
    currentImgData.value = data.img
    drawImage(data.img)
  }
  if (data.draw) {
    applyDraw(data.draw)
  }
}

const applyDraw = (src: string) => {
  const img = new Image()
  img.src = src
  img.onload = () => {
    drawCtx.clearRect(0, 0, drawCtx.canvas.width, drawCtx.canvas.height)
    drawCtx.drawImage(img, 0, 0, drawCtx.canvas.width, drawCtx.canvas.height)
  }
}

const drawImage = (src: string) => {
  const image = new Image()
  image.src = src
  image.onload = () => {
    const { width: imgWidth, height: imgHeight } = image
    // scale to fit the canvas
    const { width: canvasWidth, height: canvasHeight } = imageCtx.canvas
    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight)
    // resize both canvas to fit the image
    imageCtx.canvas.width = imgWidth * scale
    imageCtx.canvas.height = imgHeight * scale
    drawCtx.canvas.width = imgWidth * scale
    drawCtx.canvas.height = imgHeight * scale
    imageCtx.drawImage(image, 0, 0, imgWidth, imgHeight, 0, 0, imgWidth * scale, imgHeight * scale)
  }
}

const brushSize = ref(28)
const brushColor = '#EF4149'
const brushCursorColor = '#EF414999'
const eraserCursorColor = '#0BC0CF99'

let isDrawing = false
const drawMode = ref<'draw' | 'erase'>('draw')

const handleBrushSizeChange = (size: number) => {
  brushSize.value = size

  setCursors()
}

const setCursors = () => {
  const cursorImg = document.createElement('canvas')
  cursorImg.width = brushSize.value
  cursorImg.height = brushSize.value
  const cursorCtx = cursorImg.getContext('2d') as CanvasRenderingContext2D
  cursorCtx.beginPath()
  cursorCtx.arc(brushSize.value / 2, brushSize.value / 2, brushSize.value / 2, 0, Math.PI * 2)
  cursorCtx.fillStyle = drawMode.value === 'draw' ? brushCursorColor : eraserCursorColor
  cursorCtx.fill()
  cursorCtx.closePath()
  const cursor = cursorImg.toDataURL()
  drawCtx.canvas.style.cursor = `url(${cursor}) ${brushSize.value / 2} ${brushSize.value / 2}, auto`
}

const startDraw = (e: MouseEvent) => {
  if (!drawCtx) return
  drawCtx.beginPath()
  if (drawMode.value === 'draw') {
    drawCtx.globalCompositeOperation = 'source-over'
  } else {
    drawCtx.globalCompositeOperation = 'destination-out'
  }
  drawCtx.moveTo(e.offsetX, e.offsetY)
  isDrawing = true
}

const drawing = (e: MouseEvent) => {
  if (!drawCtx || !isDrawing) return
  drawCtx.lineTo(e.offsetX, e.offsetY)
  drawCtx.lineCap = 'round'
  drawCtx.lineJoin = 'round'
  drawCtx.lineWidth = brushSize.value
  drawCtx.strokeStyle = brushColor
  drawCtx.stroke()
}

const endDraw = () => {
  if (!drawCtx || !isDrawing) return
  isDrawing = false
  drawCtx.closePath()
  undoRedo.record({ draw: drawCtx.canvas.toDataURL() })
  drawCtx.globalCompositeOperation = 'source-over'
}

const inpaint = async () => {
  const controlImg = await exportMaskedImage()
  if (!controlImg) return
  const url = await requestInpainting(controlImg, prompt.value)
  if (!url) return

  // save the current image data to undo stack
  const current = undoRedo.current()
  if (current) {
    current.img = currentImgData.value
  }

  const img = new Image()
  img.src = url
  await asyncOnload(img)
  currentImgData.value = url
  imageCtx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    0,
    0,
    imageCtx.canvas.width,
    imageCtx.canvas.height
  )
  // clear the draw canvas
  drawCtx.clearRect(0, 0, drawCtx.canvas.width, drawCtx.canvas.height)

  undoRedo.record({ img: currentImgData.value })
}

onMounted(() => {
  if (!container.value || !drawCanvas.value || !imageCanvas.value) return
  drawCtx = drawCanvas.value.getContext('2d') as CanvasRenderingContext2D
  imageCtx = imageCanvas.value.getContext('2d') as CanvasRenderingContext2D
  resizeCanvas()
  drawImage(currentImgData.value)
  undoRedo.setInitial({ img: currentImgData.value })
  window.addEventListener('resize', resizeCanvas)
  document.addEventListener('mouseup', endDraw)
  handleBrushSizeChange(brushSize.value)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('mouseup', endDraw)
})

const exportMaskedImage = async () => {
  if (!drawCanvas.value || !imageCanvas.value) return
  const tempCanvas = document.createElement('canvas')
  const baseImg = new Image()
  baseImg.src = currentImgData.value
  const drawImg = new Image()
  drawImg.src = drawCanvas.value.toDataURL()
  await asyncOnload(baseImg)
  await asyncOnload(drawImg)
  tempCanvas.width = baseImg.width
  tempCanvas.height = baseImg.height
  const tempCtx = tempCanvas.getContext('2d') as CanvasRenderingContext2D
  tempCtx.drawImage(baseImg, 0, 0)
  // clear the alpha channel
  tempCtx.globalCompositeOperation = 'destination-out'
  tempCtx.drawImage(drawImg, 0, 0, baseImg.width, baseImg.height)
  tempCtx.globalCompositeOperation = 'source-over'

  return tempCanvas
}

const asyncOnload = (img: HTMLImageElement) => {
  return new Promise<void>((resolve) => {
    img.onload = () => resolve()
  })
}

const searchCtx = useSearchCtx()

const prompt = ref<string>(searchCtx.keyword)

const requestInpainting = async (controlImg: HTMLCanvasElement, prompt?: string) => {
  const d = new Disposable()
  // img to blob
  const imgBlob = await (async function () {
    return new Promise<Blob>((resolve, reject) => {
      controlImg.toBlob((blob) => {
        if (!blob) {
          reject('failed to convert canvas to blob')
          return
        }
        resolve(blob)
      })
    })
  })()

  // blob to file url
  const file = fromBlob('control.png', imgBlob)
  const { fileCollection } = await saveFiles({ 'control.png': file })
  const urlMap = (await client.post('/util/fileurls', {
    objects: [fileCollection['control.png']]
  })) as { objectUrls: UniversalToWebUrlMap }
  const url = urlMap.objectUrls[fileCollection['control.png']]

  const task = new InpaintingTask({
    prompt: prompt ?? searchCtx.keyword,
    category: searchCtx.category.join(','),
    type: 1,
    model_name: '',
    control_image_url: url,
    image_url: url,
    callback_url: ''
  })

  return new Promise<string>((resolve, reject) => {
    task.start()
    task.addEventListener('AIGCFinished', () => {
      resolve(task.result?.imageUrl ?? '')
      d.dispose()
    })
    task.addEventListener('AIGCFailed', () => {
      reject(task.failureMessage ?? t({ en: 'Failed to inpaint', zh: '重绘失败' }))
      d.dispose()
    })
  })
}

const errorMessage = useMessage()

const actions = computed(
  () =>
    [
      {
        name: 'undo',
        label: { zh: '撤销', en: 'Undo' },
        icon: UndoFilled,
        type: 'secondary' satisfies ButtonType,
        disabled: undoRedo.undoStackLength.value === 0,
        action: () => {
          const current = undoRedo.undo()
          if (current) {
            applyUndoRedo(current)
          }
        }
      },
      {
        name: 'redo',
        label: { zh: '重做', en: 'Redo' },
        icon: RedoFilled,
        type: 'secondary' satisfies ButtonType,
        disabled: undoRedo.redoStackLength.value === 0,
        action: () => {
          const current = undoRedo.redo()
          if (current) {
            applyUndoRedo(current)
          }
        }
      },
      {
        name: 'cancel',
        label: { zh: '取消', en: 'Cancel' },
        icon: CancelOutlined,
        type: 'secondary' satisfies ButtonType,
        action: () => {
          emit('cancel')
        }
      },
      {
        name: 'resolve',
        label: { zh: '确定', en: 'Confirm' },
        icon: CheckFilled,
        type: 'secondary' satisfies ButtonType,
        action: async () => {
          emit('resolve', currentImgData.value)
        }
      },
      {
        name: '__separator__',
        component: () => {
          return h('div', { style: { flex: 1 } })
        }
      },
      {
        name: 'brush-type',
        component: () => {
          return h('div', { class: 'image-repaint-tool-container' }, [
            h('span', t({ zh: '切换: ', en: 'Switch: ' })),
            h(
              'div',
              { class: 'brush-type-switch' },
              h(
                NIcon,
                {
                  style: { cursor: 'pointer' },
                  size: '20px',
                  onClick: () => {
                    drawMode.value = drawMode.value === 'draw' ? 'erase' : 'draw'
                    setCursors()
                  }
                },
                drawMode.value === 'draw' ? h(DrawOutlined) : h('svg', { innerHTML: Erase })
              )
            )
          ])
        }
      },
      {
        name: 'brush-size',
        component: () => {
          return h('div', { class: 'image-repaint-tool-container', style: 'margin-right: 1rem' }, [
            h('span', t({ zh: '画笔大小: ', en: 'Brush size: ' })),
            h(BrushSize, {
              brushSize: brushSize.value,
              'onUpdate:brushSize': handleBrushSizeChange
            })
          ])
        }
      },
      // prompt
      {
        name: 'prompt',
        component: () => {
          return h('div', { class: 'image-repaint-tool-container' }, [
            h('span', t({ zh: '提示: ', en: 'Prompt: ' })),
            h(UITextInput, {
              value: prompt.value,
              style: { width: '200px' },
              'onUpdate:value': (value: string) => {
                prompt.value = value
              }
            })
          ])
        }
      },
      {
        name: 'repaint',
        label: { zh: '重绘', en: 'Repaint' },
        icon: AutoFixHighOutlined,
        type: 'primary' satisfies ButtonType,
        action: () => {
          emit('loading', true)
          inpaint()
            .catch((e) => {
              errorMessage.error(e)
            })
            .finally(() => {
              emit('loading', false)
            })
        }
      }
    ] satisfies EditorAction[]
)

defineExpose({
  inpaint,
  actions: actions
})
</script>

<style scoped>
.repaint-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas {
  position: absolute;
}

.draw-canvas {
  z-index: 10;
  opacity: 0.6;
}

.image-canvas {
  z-index: 1;
}
</style>
<style>
.brush-type-switch {
  box-shadow: 0px 3px 8px 0px rgba(51, 51, 51, 0.48);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-repaint-tool-container {
  user-select: none;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  flex-wrap: nowrap;
}
</style>
