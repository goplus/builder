<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:11:19
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-24 00:22:50
 * @FilePath: /builder/spx-gui/src/components/sprite-list/ImageCardCom.vue
 * @Description: 
-->
<template>
  <div :class="cardClassName">
    <div class="close-button" v-if="props.type === 'sprite'" @click="deleteSprite(props.asset.name)">×</div>
    <div class="close-button" v-else @click="deleteBackdrop(props.asset.name)">×</div>
    <n-image
      preview-disabled
      :width="imageWidth"
      :height="imageHeight"
      :src="spriteUrl"
      fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
    />
    {{ props.type === "bg" ? "" : props.asset.name }}
  </div>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineProps, computed } from "vue";
import { NImage } from "naive-ui";
import { useSpriteStore } from "@/store/modules/sprite";
import { useBackdropStore } from '@/store/modules/backdrop'
import AssetBase from "@/class/AssetBase"
import Backdrop from "@/class/backdrop"

// ----------props & emit------------------------------------
interface propType {
  type?: string;
  asset: AssetBase | Backdrop;
}
const props = defineProps<propType>();

// ----------data related -----------------------------------
const spriteStore = useSpriteStore()
const backdropStore = useBackdropStore()

// ----------computed properties-----------------------------
const cardClassName = computed(() =>
  props.type === "bg" ? "bg-list-card" : "sprite-list-card"
);
const imageWidth = computed(() => (props.type === "bg" ? 40 : 75));
const imageHeight = computed(() => (props.type === "bg" ? 40 : 75));
const spriteUrl = computed(() => {
  // check file is not empty
  if (props.asset && props.asset.files && props.asset.files.length > 0) {
    return props.asset.files[0].url;
  } else {
    return '';
  }
});

// ----------methods-----------------------------------------
/**
 * @description: Function for deleting sprite
 * @Author: Xu Ning
 * @Date: 2024-01-23 14:29:02
 */
const deleteSprite = (name: string) =>{
  spriteStore.removeItemByName(name)
}

const deleteBackdrop = (name:string) =>{
  console.log('delete',name)
  backdropStore.removeItemByName(name)
}

</script>

<style scoped lang="scss">
@import "@/assets/theme.scss";

@mixin listCardBase {
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
