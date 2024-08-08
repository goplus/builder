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
import { computed, onMounted, ref } from 'vue'
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

const mapWidth = ref(800)
const mapHeight = ref(600)

const updateMapSize = () => {
  if (!editorContainer.value) {
	return
  }
  mapWidth.value = editorContainer.value.clientWidth
  mapHeight.value = editorContainer.value.clientHeight
}

onMounted(() => {
  updateMapSize()
  window.addEventListener('resize', updateMapSize)
})

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

const FILL_PERCENT = 0.8

const imageSize = computed(() => {
  if (!image.value) {
	return null
  }
  const width = image.value.width
  const height = image.value.height
  const scale = Math.min(mapWidth.value / width, mapHeight.value / height) * FILL_PERCENT
  return { width: width * scale, height: height * scale, scale }
})

const config = computed<ImageConfig | null>(() => {
  if (!backdrop.value) {
    return null
  }
  const { name } = backdrop.value
  const config = {
    spriteName: name,
    image: image.value ?? undefined,
    draggable: true,
    offsetX: 0,
    offsetY: 0,
    visible: true,
	// center the image
    x: mapWidth.value / 2 - (imageSize.value?.width ?? 0) / 2,
	y: mapHeight.value / 2 - (imageSize.value?.height ?? 0) / 2,
    rotation: 0, 
    scaleX: imageSize.value?.scale ?? 1,
    scaleY: imageSize.value?.scale ?? 1,
  } satisfies ImageConfig
  return config
})
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
