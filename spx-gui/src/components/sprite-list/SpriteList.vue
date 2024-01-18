<!--
 * @Author: Xu Ning
 * @Date: 2024-01-17 18:11:17
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-18 23:32:54
 * @FilePath: /builder/spx-gui/src/components/sprite-list/SpriteList.vue
 * @Description: 
-->
<template>
  <div class="asset-library">
    <n-grid cols="4" item-responsive responsive="screen">
      <!-- S Layout Sprite List -->
      <n-grid-item class="asset-library-left" span="4 m:3">
        <!-- S Component SpriteEditBtn -->
        <SpriteEditBtn />
        <!-- E Component SpriteEditBtn -->
        <div class="sprite-list-card">
          <n-flex >
            <!-- S Component Add Button -->
            <SpriteAddBtn :type="'sprite'"/>
            <!-- E Component Add Button type second step -->
            <!-- S Component SpriteCom -->
            <SpriteCom
              v-for="asset in spriteAssets"
              :key="asset.id"
              :type="'sprite'"
              :asset="asset"
              :style="{ 'margin-bottom': '26px' }"
            />
            <!-- E Component SpriteCom -->
          </n-flex>
        </div>
      </n-grid-item>
      <!-- E Layout Sprite List -->
      <!-- S Layout Stage List -->
      <n-grid-item class="asset-library-right" span="0 m:1">
        <StageCom />
      </n-grid-item>
      <!-- E Layout Stage List -->
    </n-grid>
  </div>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { ref } from "vue";
import { NGrid, NGridItem, NFlex } from "naive-ui";
import { Asset } from "@/interface/library.ts";
import StageCom from "@/components/sprite-list/StageCom.vue";
import SpriteEditBtn from "@/components/sprite-list/SpriteEditBtn.vue";
import SpriteCom from "@/components/sprite-list/SpriteCom.vue";
import SpriteAddBtn from "@/components/sprite-list/SpriteAddBtn.vue";

// sprite list assets
const spriteAssets = ref<Asset[]>([
  {
    id: 1,
    name: "dog",
    address:
      "https://ouch-cdn2.icons8.com/tX5Nqomcl5Ar98OkTCv_-6564NJq78WutoyiY6TVijY/rs:fit:368:350/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvMi9i/MDZiZTI4OC02NDg1/LTQ3NjctOTVmOC1m/YmVjYWU3M2EyMDMu/cG5n.png",
  },
  {
    id: 1,
    name: "dog",
    address:
      "https://ouch-cdn2.icons8.com/tX5Nqomcl5Ar98OkTCv_-6564NJq78WutoyiY6TVijY/rs:fit:368:350/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvMi9i/MDZiZTI4OC02NDg1/LTQ3NjctOTVmOC1m/YmVjYWU3M2EyMDMu/cG5n.png",
  },
  {
    id: 2,
    name: "cat",
    address:
      "https://ouch-cdn2.icons8.com/tX5Nqomcl5Ar98OkTCv_-6564NJq78WutoyiY6TVijY/rs:fit:368:350/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvMi9i/MDZiZTI4OC02NDg1/LTQ3NjctOTVmOC1m/YmVjYWU3M2EyMDMu/cG5n.png",
  },
  {
    id: 1,
    name: "dog",
    address:
      "https://ouch-cdn2.icons8.com/tX5Nqomcl5Ar98OkTCv_-6564NJq78WutoyiY6TVijY/rs:fit:368:350/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvMi9i/MDZiZTI4OC02NDg1/LTQ3NjctOTVmOC1m/YmVjYWU3M2EyMDMu/cG5n.png",
  },
]);
</script>

<style scoped lang="scss">
@import "@/assets/theme.scss";
.asset-library {
  // TODO: Delete the background, it is just for check the position.
  // background:#f0f0f0;
  .asset-library-left,
  .asset-library-right {
    max-height: calc(60vh - 80px - 24px);
    overflow: scroll;
  }
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
