<!--
 * @Author: Xu Ning
 * @Date: 2024-01-15 17:18:15
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-02-05 17:06:23
 * @FilePath: /builder/spx-gui/src/components/spx-library/SpriteCard.vue
 * @Description: sprite Card
-->
<template>
  <!-- S Component Sprite Card -->
  <div class="sprite-card" @click="addAssetToListFunc(props.assetInfo.id, props.assetInfo.name, assetImageUrl)">
    <n-image
      preview-disabled
      width="100"
      height="100"
      :src="assetImageUrl"
      fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
    />
    {{ props.assetInfo.name }}
  </div>
  <!-- E Component Sprite Card -->
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { NImage } from "naive-ui";
import { defineProps, defineEmits, computed } from "vue";
import type { Asset } from "@/interface/library";

// ----------props & emit------------------------------------
interface PropsType {
  assetInfo: Asset;
}
const props = defineProps<PropsType>();
const emits = defineEmits(['add-asset']);

// ----------computed properties-----------------------------
// Compute the asset images' url
const assetImageUrl = computed(() => {
  try {
    const addressObj = JSON.parse(props.assetInfo.address);
    const assets = addressObj.assets;
    const firstKey = Object.keys(assets)[0];
    console.log('addressObj',addressObj,firstKey)
    return assets[firstKey];
  } catch (error) {
    console.error('Failed to parse address:', error);
    return ''; // 返回一个空字符串或者默认图像URL
  }
});

// ----------methods-----------------------------------------
/**
 * @description: A function to add sprite to list
 * @param {*} name
 * @param {*} file
 * @Author: Xu Ning
 * @Date: 2024-01-24 12:18:12
 */
// TODO: change one address as a obj
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
