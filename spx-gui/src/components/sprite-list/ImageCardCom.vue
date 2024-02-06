<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:11:19
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-06 12:54:20
 * @FilePath: /builder/spx-gui/src/components/sprite-list/ImageCardCom.vue
 * @Description: 
-->
<template>
  <div v-if="props.type === 'sprite'" :class="computedProperties.cardClassName" >
    <div class="close-button" @click="deleteSprite(props.asset.name)">×</div>
    <n-image
      preview-disabled
      :width="computedProperties.imageWidth"
      :height="computedProperties.imageHeight"
      :src="computedProperties.spriteUrl"
      fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
    />
    {{ props.asset.name }}
  </div>
  <div
    v-for="(file, index) in computedProperties.backdropFiles"
    v-else
    :key="index"
    :class="computedProperties.cardClassName"
  >
    <div class="close-button" @click="deleteBackdrop(file)">×</div>
    <n-image
      preview-disabled
      :width="computedProperties.imageWidth"
      :height="computedProperties.imageHeight"
      :src="file.url"
      fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
    />
  </div>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineProps, computed } from "vue";
import { NImage } from "naive-ui";
import { useSpriteStore } from '@/store/modules/sprite';
import { useBackdropStore } from '@/store/modules/backdrop';
import { AssetBase } from "@/class/asset-base";
import { Backdrop } from "@/class/backdrop";
import FileWithUrl from "@/class/file-with-url";

// ----------props & emit------------------------------------
interface PropType {
  type?: string;
  asset: AssetBase | Backdrop;
}
const props = defineProps<PropType>();
const spriteStore = useSpriteStore(); 
const backdropStore = useBackdropStore(); 

// ----------computed properties-----------------------------
// Computed card style/ image width/ image height/ spriteUrl/ backdropFiles by props.type.
const computedProperties = computed(() => {
  const isBg = props.type === "bg";
  const hasFiles = props.asset && props.asset.files && props.asset.files.length > 0;
  return {
    cardClassName: isBg ? "bg-list-card" : "sprite-list-card",
    imageWidth: isBg ? 40 : 75,
    imageHeight: isBg ? 40 : 75,
    spriteUrl: !isBg && hasFiles ? props.asset.files[0].url : "",
    backdropFiles: isBg && hasFiles ? props.asset.files : []
  };
});

// ----------methods-----------------------------------------
/**
 * @description: A Function about deleting sprite by name.
 * @param {*} name
 * @Author: Xu Ning
 * @Date: 2024-01-23 14:29:02
 */
const deleteSprite = (name: string) => {
  spriteStore.removeItemByName(name)
};

/**
 * @description: A Function about deleting backdrop's file.
 * @param {*} file
 * @Author: Xu Ning
 * @Date: 2024-01-24 12:11:38
 */
const deleteBackdrop = (file: FileWithUrl) => {
  backdropStore.backdrop.removeFile(file)
};
</script>

<style scoped lang="scss">
@import "@/assets/theme.scss";

@mixin listCardBase {
  font-family:'Heyhoo';
  margin: 10px auto;
  border-radius: 20px;
  box-shadow: 0 0 5px $sprite-list-card-box-shadow;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: visible; // show x button
  cursor: pointer;

  .close-button {
    position: absolute;
    top: -5px;
    right: -10px;
    background-color: $sprite-list-card-close-button;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    color: $sprite-list-card-close-button-x;
    border: 2px solid $sprite-list-card-close-button-border;
    z-index: 10;
  }
}

.bg-list-card {
  @include listCardBase;
  width: 60px;
  height: 60px;

  .close-button {
    width: 15px;
    height: 15px;
    font-size: 20px;
  }
}

.sprite-list-card {
  @include listCardBase;
  width: 110px;
  height: 110px;

  .close-button {
    width: 30px;
    height: 30px;
    font-size: 40px;
  }
}
</style>
