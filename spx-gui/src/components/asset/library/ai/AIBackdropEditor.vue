<template>
  <div ref="editorContainer" class="container">
    <v-stage v-if="stageConfig != null" ref="stage" :config="stageConfig">
      <v-layer ref="layer">
        <v-image ref="nodeRef" :config="config" />
      </v-layer>
    </v-stage>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { isContentReady, type TaggedAIAssetData } from '@/apis/aigc'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import { cachedConvertAssetData } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import type { AssetType } from '@/apis/asset'
import type { Backdrop } from '@/models/backdrop'
import { useFileImg } from '@/utils/file'
import type Konva from 'konva'

const props = defineProps<{
  asset: TaggedAIAssetData<AssetType.Backdrop>
}>()

const backdrop = useAsyncComputed<Backdrop | undefined>(() => {
  if (!props.asset[isContentReady]) {
    return new Promise((resolve) => resolve(undefined))
  }
  return cachedConvertAssetData(props.asset as Required<TaggedAIAssetData<AssetType.Backdrop>>)
})

const editorContainer = ref<HTMLElement>()
const stage = ref<Konva.Stage>()
const layer = ref<Konva.Layer>()
const nodeRef = ref<Konva.Image>()

const mapWidth = computed(() => editorContainer.value?.clientWidth ?? 0)
const mapHeight = computed(() => editorContainer.value?.clientHeight ?? 0)

const stageConfig = computed(() => {
  if (!editorContainer.value) {
    return null
  }
  return {
    width: mapWidth.value,
    height: mapHeight.value,
    scale: {
      x: 1,
      y: 1
    }
  }
})

const [image] = useFileImg(() => backdrop.value?.img)

const config = computed<ImageConfig | null>(() => {
  if (!backdrop.value) {
    return null
  }
  console.log('backdrop:', backdrop.value, 'image:', image.value)
  const { name, img, x, y, bitmapResolution, faceRight } = backdrop.value
  const scale = 1 //size / bitmapResolution
  const config = {
    spriteName: name,
    image: image.value ?? undefined,
    draggable: true,
    offsetX: 0,
    offsetY: 0,
    visible: true,
    x: mapWidth.value / 2 + x,
    y: mapHeight.value / 2 - y,
    rotation: 0, //nomalizeDegree(heading - 90),
    scaleX: scale,
    scaleY: scale
  } satisfies ImageConfig
  //   const c = costume.value
  //   if (c != null) {
  //     config.offsetX = c.x + pivot.x * c.bitmapResolution
  //     config.offsetY = c.y - pivot.y * c.bitmapResolution
  //   }
  //   if (rotationStyle === RotationStyle.leftRight && headingToLeftRight(heading) === LeftRight.left) {
  //     config.rotation = leftRightToHeading(LeftRight.left) - 90 // -180
  //     // the image is already rotated with `rotation: -180`, so we adjust `scaleY` to flip it vertically
  //     config.scaleY = -config.scaleY
  //     // Note that you can get the same result with `ratation: 0, scaleX: -scaleX` here, but there will be problem
  //     // if the user then do transform with transformer. Konva transformer prefers to make `scaleX` positive.
  //   }
  return config
})
</script>

<style scoped></style>
