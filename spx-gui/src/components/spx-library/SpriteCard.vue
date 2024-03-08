<!--
 * @Author: Xu Ning
 * @Date: 2024-01-15 17:18:15
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-29 22:31:04
 * @FilePath: /builder/spx-gui/src/components/spx-library/SpriteCard.vue
 * @Description: sprite Card
-->
<template>
  <!-- S Component Sprite Card -->
  <div class="sprite-card" @click="addAssetToListFunc(props.assetInfo.id, props.assetInfo.name, assetImageUrl)">
    <n-image
      v-show="!shouldShowGif"
      preview-disabled
      width="100"
      height="100"
      :src="assetImageUrl"
      :fallback-src="error"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    />
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
    {{ props.assetInfo.name }}
  </div>
  <!-- E Component Sprite Card -->
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { NImage } from "naive-ui";
import { defineProps, defineEmits, computed, ref } from "vue";
import type { Asset } from "@/interface/library";
import error from '@/assets/image/library/error.svg'

// ----------props & emit------------------------------------
interface PropsType {
  assetInfo: Asset;
}
const props = defineProps<PropsType>();
const emits = defineEmits(['add-asset']);

// ----------data related -----------------------------------
// Ref about the hovering state to judge if should show gif.
const isHovering = ref<boolean>(false);

// ----------computed properties-----------------------------
// Compute the asset images' url
const assetImageUrl = computed(() => {
  try {
    const addressObj = JSON.parse(props.assetInfo.address);
    const assets = addressObj.assets;
    const firstKey = Object.keys(assets)[0];
    return assets[firstKey];
  } catch (error) {
    console.error('Failed to parse address:', error);
    return ''; 
  }
});

// Compute the asset gif url if it has
const assetImageGifUrl = computed(() => {
  try {
    const addressObj = JSON.parse(props.assetInfo.address);
    if(addressObj.type != 'gif'){
      return ''
    }
    return addressObj.url
  } catch (error) {
    console.error('Failed to parse address:', error);
    return ''; 
  }
});

// Compute show gif or not (record to the imageUrl and hovering state).
const shouldShowGif = computed(()=> isHovering.value && assetImageGifUrl.value !== '')

// ----------methods-----------------------------------------
/**
 * @description: A function to add sprite to list
 * @param {*} name
 * @param {*} file
 * @Author: Xu Ning
 * @Date: 2024-01-24 12:18:12
 */
const addAssetToListFunc = (id:number, name: string, address: string|undefined) =>{
  emits('add-asset', id, name, address);
}

</script>

<style scoped lang="scss">
@import "@/assets/theme.scss";

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
