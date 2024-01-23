import SpriteAddBtn from '@/components/sprite-list/SpriteAddBtn.vue';
<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:08:16
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-23 23:24:05
 * @FilePath: /builder/spx-gui/src/components/sprite-list/BackdropList.vue
 * @Description: 
-->
<template>
  <div class="stage-list">
    Stage
    <div class="stage-list-space">
      <SpriteAddBtn :type="'bg'" />
      <ImageCardCom
        :key="backdrop.name"
        :type="'bg'"
        :asset="backdrop"
        :style="{ 'margin-bottom': '26px' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import ImageCardCom from "@/components/sprite-list/ImageCardCom.vue";
import SpriteAddBtn from "@/components/sprite-list/SpriteAddBtn.vue";
import {useBackdropStore} from "@/store/modules/backdrop";

// ----------props & emit------------------------------------
const backdropStore = useBackdropStore()

// ----------data related -----------------------------------
// Backdrop lists
const { backdrop } = storeToRefs(backdropStore);
// const backdrop = ref<Backdrop>(backdropStore.backdrop as Backdrop)

</script>

<style scoped lang="scss">
.stage-list {
  text-align: center;
  height: calc(100% - 20px);
  padding: 10px;
  .stage-list-space {
    background: white;
    box-shadow: 0 5px 5px 0 #00000019;
    margin: 0 10px;
    height: calc(100% - 20px);
    overflow: scroll;
    border-radius: 20px;
  }
}
</style>
