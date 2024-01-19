<!--
 * @Author: Xu Ning
 * @Date: 2024-01-15 17:18:15
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-18 16:42:48
 * @FilePath: /builder/spx-gui/src/components/spx-library/SpriteCard.vue
 * @Description: sprite Card
-->
<template>
  <!-- S Component Sprite Card -->
  <div class="sprite-card">
    <n-image
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
import { NImage } from "naive-ui";
import { defineProps } from "vue";
import type { SpriteInfoType } from "@/interface/library";

interface propsType {
  spriteInfo: SpriteInfoType;
}

const props = defineProps<propsType>();

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
