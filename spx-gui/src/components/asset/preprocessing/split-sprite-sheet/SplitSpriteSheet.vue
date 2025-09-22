<template>
  <ProcessDetail v-show="active" :applied="applied && !dirty" :apply-fn="apply" :cancel-fn="cancel">
    <template #header>
      {{ $t({ en: 'Split sprite sheet', zh: '切分精灵表' }) }}
      <UINumberInput v-model:value="rowNum" class="num-input" :min="1" :max="maxGridSize">
        <template #prefix> {{ $t({ en: 'Rows', zh: '行数' }) }}: </template>
      </UINumberInput>
      <UINumberInput v-model:value="colNum" class="num-input" :min="1" :max="maxGridSize">
        <template #prefix> {{ $t({ en: 'Columns', zh: '列数' }) }}: </template>
      </UINumberInput>
    </template>
    <ImgPreview ref="imgPreviewRef" :file="file" :multiple="false" />
    <UILoading cover :visible="recognizing" />
  </ProcessDetail>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { untilNotNull, memoizeAsync } from '@/utils/utils'
import { useFileImg } from '@/utils/file'
import { sleep } from '@/utils/test'
import { stripExt } from '@/utils/path'
import { getImgDrawingCtx } from '@/utils/canvas'
import { fromBlob, type File } from '@/models/common/file'
import { UILoading, UINumberInput, useUIVariables } from '@/components/ui'
import ProcessDetail from '../common/ProcessDetail.vue'
import ImgPreview from '../common/ImgPreview.vue'
import type { MethodComponentEmits, MethodComponentProps } from '../common/types'
import { cutGrid, recognizeSpriteGrid, type Color } from './utils'

const props = defineProps<MethodComponentProps>()
const emit = defineEmits<MethodComponentEmits>()

const maxGridSize = 50

// SplitSpriteSheet is supposed to take at most one file
const file = computed(() => props.input[0])
const [imgRef] = useFileImg(file)
const bgColorRef = ref<Color | null>(null)
const rowNum = ref(1)
const colNum = ref(1)
// TODO: support recognizing & adjusting for padding & offset
const recognizing = ref(false)

// use `memoizeAsync` to ensure that recognition for same file runs only once
const autoRecognize = memoizeAsync(async (img: HTMLImageElement) => {
  recognizing.value = true
  await sleep(100) // ensure minimum duration for ui loading
  for await (const yielded of recognizeSpriteGrid(img)) {
    if (yielded.type === 'bgColor') bgColorRef.value = yielded.color
    if (yielded.type === 'rowCol') {
      rowNum.value = Math.min(yielded.rowNum, maxGridSize)
      colNum.value = Math.min(yielded.colNum, maxGridSize)
      break
    }
  }
  recognizing.value = false
})

watch(
  () => props.active,
  async (active) => {
    if (!active) return
    const img = await untilNotNull(imgRef)
    await autoRecognize(img)
  }
)

const imgPreviewRef = ref<InstanceType<typeof ImgPreview> | null>(null)
const uiVariables = useUIVariables()

function drawGrid() {
  if (imgPreviewRef.value == null || imgRef.value == null) return
  const [imgPreview, img] = [imgPreviewRef.value, imgRef.value]
  const canvas = imgPreview.getCanvas()
  if (canvas == null) return
  const ctx = getImgDrawingCtx(canvas)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)
  ctx.strokeStyle = uiVariables.color.grey[800]
  const scale = canvas.width / canvas.getBoundingClientRect().width
  ctx.lineWidth = Math.max(1, Math.round(scale))
  for (let i = 1; i < rowNum.value; i++) {
    const y = Math.round((i * canvas.height) / rowNum.value)
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }
  for (let i = 1; i < colNum.value; i++) {
    const x = Math.round((i * canvas.width) / colNum.value)
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }
}

/**
 * If current preview-state different from the applied output.
 * When the user changed the row/col number, the preview-state is dirty, until the the changes are applied again.
 */
const dirty = ref(false)

watch([rowNum, colNum], async () => {
  drawGrid()
  dirty.value = true
})

async function apply() {
  const img = await untilNotNull(imgRef)
  const bgColor = await untilNotNull(bgColorRef)
  const rows = await cutGrid(img, {
    rowNum: rowNum.value,
    colNum: colNum.value,
    bgColor: bgColor,
    mimeType: 'image/png'
  })
  const files: File[] = []
  rows.forEach((row, rowIndex) => {
    row.forEach((pngBlob, colIndex) => {
      let name = stripExt(file.value.name)
      if (rowNum.value > 1) name += `-${rowIndex + 1}`
      if (colNum.value > 1) name += `-${colIndex + 1}`
      name += '.png'
      files.push(fromBlob(name, pngBlob))
    })
  })
  dirty.value = false
  emit('applied', files)
}

async function cancel() {
  dirty.value = false
  emit('cancel')
}
</script>

<style lang="scss" scoped>
.num-input {
  width: 120px;
}
</style>
