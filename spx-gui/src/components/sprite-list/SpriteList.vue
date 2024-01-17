<!--
 * @Author: Xu Ning
 * @Date: 2024-01-17 18:11:17
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-17 23:44:28
 * @FilePath: /builder/spx-gui/src/components/sprite-list/SpriteList.vue
 * @Description: 
-->
<template>
  <div class="asset-library">
    <!-- S Component Choose Button -->
    <NButton @click="openLibraryFunc">open library</NButton>
    <!-- E Component Choose Button -->
    <!-- S Modal Library -->
    <LibraryModal v-model:show="showModal" :categories="spriteCategories" :spriteInfos="spriteInfos"/>
    <!-- E Modal Library -->
  </div>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import {ref} from "vue";
import {
  NButton
} from "naive-ui";

import { SpriteInfoType } from "@/interface/library";
// TODO: replace mock by api link
import { SpriteInfosMock } from "@/mock/library";
import LibraryModal from "@/components/spx-library/LibraryModal.vue"

// sprite Info list
const spriteInfos = ref<SpriteInfoType[]>(SpriteInfosMock);
// sprite categories
const spriteCategories = ["ALL", "Animals", "People", "Sports", "Food", "Fantasy"];
// show modal or not
const showModal = ref<boolean>(false);

/**
 * @description: open library modal function
 * @Author: Xu Ning
 * @Date: 2024-01-16 11:53:40
 */
 const openLibraryFunc = () => {
  showModal.value = true;
};
</script>

<style lang="scss">
@import "@/assets/theme.scss";
// ! no scoped, it will change global style
.n-card {
  width: 80vw;
  border-radius: 25px;
  .n-card-header {
    border-radius: 25px 25px 0 0;
    background: $asset-library-card-title-1;
    text-align: center;
  }
  .n-card__content {
    padding: 0 !important;
  }
}
</style>