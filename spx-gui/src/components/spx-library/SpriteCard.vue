<!--
 * @Author: Xu Ning
 * @Date: 2024-01-15 17:18:15
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-23 16:22:33
 * @FilePath: /builder/spx-gui/src/components/spx-library/SpriteCard.vue
 * @Description: sprite Card
-->
<template>
  <!-- S Component Sprite Card -->
  <div class="sprite-card" @click="addSpriteToListFunc(props.spriteInfo.name)">
    <n-image
      preview-disabled
      width="100"
      height="100"
      :src="props.spriteInfo.image"
      fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
    />
    {{ props.spriteInfo.name }}
  </div>
  <!-- E Component Sprite Card -->
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { NImage } from "naive-ui";
import { defineProps } from "vue";
import type { SpriteInfoType } from "@/interface/library";
import { useSpriteStore } from "@/store/modules/sprite";
import Sprite from "@/class/sprite";

// ----------props & emit------------------------------------
interface propsType {
  spriteInfo: SpriteInfoType;
}
const props = defineProps<propsType>();

// ----------data related -----------------------------------
const spriteStore = useSpriteStore()


const addSpriteToListFunc = (spriteName: string, file?: File[]) =>{
  // TODO use the function: get file from url
  let code = ""
  // const sprite = new Sprite(spriteName, Array.from(file.value.files), code)
  const sprite = new Sprite(spriteName, file, code)
  spriteStore.addItem(sprite)
  console.log('addSpriteToListFunc', sprite, spriteStore.list)
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
