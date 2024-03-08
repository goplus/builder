<!--
 * @Author: Xu Ning
 * @Date: 2024-01-15 17:18:15
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-08 14:36:53
 * @FilePath: /builder/spx-gui/src/components/spx-library/SpriteCard.vue
 * @Description: sprite Card
-->
<template>
  <!-- S Component Sprite Card -->
  <div
    class="sprite-card"
    @click="addAssetToListFunc(props.assetInfo.id, props.assetInfo.name, assetImageUrl)"
  >
    <!-- S Component First Static Costume Card -->
    <n-image
      v-if="!isSvg && !shouldShowGif"
      preview-disabled
      width="100"
      height="100"
      :src="assetImageUrl"
      :fallback-src="error"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    />
    <n-image
      v-if="isSvg"
      preview-disabled
      width="100"
      height="100"
      :src="svgDataUri"
      :fallback-src="error"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    />
    <!-- E Component First Static Costume Card -->
    <!-- S Component Gif Costume Card -->
    <n-image
      v-if="assetImageGifUrl !== ''"
      v-show="isHovering"
      preview-disabled
      width="100"
      height="100"
      :src="assetImageGifUrl"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    />
    <!-- E Component Gif Costume Card -->

    {{ props.assetInfo.name }}
  </div>
  <!-- E Component Sprite Card -->
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { NImage } from 'naive-ui'
import { defineProps, defineEmits, computed, ref, onMounted } from 'vue'
import type { Asset } from '@/interface/library'
import error from '@/assets/image/library/error.svg'
import { fetchSvgContent } from '@/util/utils'

// ----------props & emit------------------------------------
interface PropsType {
  assetInfo: Asset
}
const props = defineProps<PropsType>()
const emits = defineEmits(['add-asset'])

// ----------data related -----------------------------------
// Ref about the hovering state to judge if should show gif.
const isHovering = ref<boolean>(false)
// Used to store converted Base64 data URIs
const svgDataUri = ref<string>('')

// ----------computed properties-----------------------------
// Determine if it's an svg image based on the suffix name
const isSvg = computed(() => {
  return assetImageUrl.value.endsWith('.svg')
})

// Compute the asset images' url
const assetImageUrl = computed(() => {
  try {
    let firstKeyValue = ''
    if (props.assetInfo.address != null) {
      const addressObj = JSON.parse(props.assetInfo.address)
      const keys = Object.keys(addressObj)
      if (keys.length > 0) {
        firstKeyValue = addressObj[keys[0]]
      }
    }
    return firstKeyValue
  } catch (error) {
    console.error('Failed to parse address:', error)
    return ''
  }
})

// Compute the asset gif url if it has
const assetImageGifUrl = computed(() => {
  return props.assetInfo.preview_address
})

// Compute show gif or not (record to the imageUrl and hovering state).
const shouldShowGif = computed(() => isHovering.value && assetImageGifUrl.value !== '')

// ----------methods-----------------------------------------
// Client-side fetching of SVG content using fetchAPI and converting to Base64.
onMounted(() => {
  if (isSvg.value) {
    fetchSvgContent(assetImageUrl.value).then((dataUri) => {
      if (dataUri) {
        svgDataUri.value = dataUri;
      }
    });
  }
})

/**
 * @description: A function to add sprite to list
 * @param {*} name
 * @param {*} file
 * @Author: Xu Ning
 * @Date: 2024-01-24 12:18:12
 */
const addAssetToListFunc = (id: number, name: string, address: string | undefined) => {
  emits('add-asset', id, name, address)
}

</script>

<style scoped lang="scss">
@import '@/assets/theme.scss';

.sprite-card {
  margin-top: 10px;
  width: 150px;
  height: 150px;
  border-radius: 20px;
  border: 3px solid $asset-library-card-title-1;
  box-shadow: 0 4px 4px 0 #00000026;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: visible;
  cursor: pointer;
}
</style>
