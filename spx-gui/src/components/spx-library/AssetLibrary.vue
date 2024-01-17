<!--
 * @Author: Xu Ning
 * @Date: 2024-01-15 14:56:42
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-17 17:59:28
 * @FilePath: /spx-gui-front-private/src/components/spx-library/AssetLibrary.vue
 * @Description: 
-->
<template>
  <div class="asset-library">
    <!-- S Component Choose Button -->
    <NButton @click="openLibraryFunc">open library</NButton>
    <!-- E Component Choose Button -->
    <!-- TODO extract n-modal as a component to use, for sprite\backdrop\sound -->
    <!-- S Modal Library -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      header-style="padding:11px 24px 11px 30%;"
      content-style="max-height:70vh;overflow:scroll;"
    >
      <!-- S Library Header -->
      <template #header>
        <div style="width: 30vw">
          <n-input
            v-model:value="searchQuery"
            size="large"
            placeholder="Search"
            clearable
            round
          />
        </div>
      </template>
      <!-- E Library Header -->

      <template #default>
        <!-- S Library Sub Header -->
        <div class="asset-library-sub-header">
          <n-flex>
            <n-button
              size="large"
              v-for="category in categories"
              :key="category"
            >
              {{ category }}
            </n-button>
            <span class="sort-btn">
              <n-button size="large" circle>
                <template #icon>
                  <n-icon><hotIcon /></n-icon>
                </template>
              </n-button>
              <n-button size="large" circle class="sort-btn-new">
                <template #icon>
                  <n-icon><newIcon /></n-icon>
                </template>
              </n-button>
            </span>
          </n-flex>
        </div>
        <!-- E Library Sub Header -->
        <!-- S Library Content -->
        <div class="asset-library-content">
          <n-grid cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
            <n-grid-item
              v-for="SpriteInfo in SpriteInfos"
              :key="SpriteInfo.name"
            >
              <div class="asset-library-sprite-item">
                <!-- S Component Sprite Card -->
                <SpriteCard :spriteInfo="SpriteInfo" />
                <!-- S Component Sprite Card -->
              </div>
            </n-grid-item>
          </n-grid>
        </div>
        <!-- E Library Content -->
      </template>
    </n-modal>
    <!-- E Modal Library -->
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import {
  NButton,
  NModal,
  NFlex,
  NGrid,
  NGridItem,
  NInput,
  NIcon,
} from "naive-ui";
import { FireFilled as hotIcon } from "@vicons/antd";
import { NewReleasesFilled as newIcon } from "@vicons/material";
import SpriteCard from "./SpriteCard.vue";
import { SpriteInfoType } from "@/interface/library";
// TODO: replace mock by api link
import { SpriteInfosMock } from "@/mock/library";

// search text
const searchQuery = ref("");
// sprite Info list
const SpriteInfos = ref<SpriteInfoType[]>(SpriteInfosMock);
// sprite categories
const categories = ["ALL", "Animals", "People", "Sports", "Food", "Fantasy"];
// show modal or not
const showModal = ref(false);

/**
 * @description: open library modal function
 * @Author: Xu Ning
 * @Date: 2024-01-16 11:53:40
 */
const openLibraryFunc = () => {
  showModal.value = true;
};
</script>

<style scoped lang="scss">
@import "@/assets/theme.scss";
.asset-library-sub-header {
  background: $asset-library-card-title-2;
  padding: 10px 24px;
  position: absolute;
  width: calc(100% - 48px);
  z-index: 100;
  .sort-btn {
    position: absolute;
    right: 24px;
    .sort-btn-new {
      margin-left: 4px;
    }
  }
}
.asset-library {
  height: calc(60vh - 80px - 48px);
}
.asset-library-content {
  margin: 60px 0 20px 0;
}
.asset-library-sprite-item {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

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
