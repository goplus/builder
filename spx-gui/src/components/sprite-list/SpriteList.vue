<!--
 * @Author: Xu Ning
 * @Date: 2024-01-17 18:11:17
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-24 12:19:24
 * @FilePath: /builder/spx-gui/src/components/sprite-list/SpriteList.vue
 * @Description: 
-->
<template>
  <div class="asset-library">
    <n-grid cols="4" item-responsive responsive="screen">
      <!-- S Layout Sprite List -->
      <n-grid-item class="asset-library-left" span="3">
        <!-- S Component SpriteEditBtn -->
        <SpriteEditBtn />
        <!-- E Component SpriteEditBtn -->
        <div class="sprite-list-card">
          <n-flex>
            <!-- S Component Add Button -->
            <SpriteAddBtn :type="'sprite'" />
            <!-- E Component Add Button type second step -->
            <!-- S Component ImageCardCom -->
            <ImageCardCom
              v-for="asset in spriteAssets"
              v-if="spriteAssets.length > 0"
              :key="asset.name"
              :type="'sprite'"
              :asset="asset"
              :style="{ 'margin-bottom': '26px' }"
            />
            <!-- E Component ImageCardCom -->
          </n-flex>
        </div>
      </n-grid-item>
      <!-- E Layout Sprite List -->
      <!-- S Layout Stage List -->
      <n-grid-item class="asset-library-right" span="1">
        <BackdropList />
      </n-grid-item>
      <!-- E Layout Stage List -->
    </n-grid>
  </div>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { ComputedRef, computed } from "vue";
import { NGrid, NGridItem, NFlex } from "naive-ui";
import BackdropList from "@/components/sprite-list/BackdropList.vue";
import SpriteEditBtn from "@/components/sprite-list/SpriteEditBtn.vue";
import ImageCardCom from "@/components/sprite-list/ImageCardCom.vue";
import SpriteAddBtn from "@/components/sprite-list/SpriteAddBtn.vue";
import { useSpriteStore } from "@/store/modules/sprite";
import Sprite from "@/class/sprite"

// ----------props & emit------------------------------------
const spriteStore = useSpriteStore()

// ----------computed properties-----------------------------
// Computed spriteAssets from spriteStore.
const spriteAssets: ComputedRef<Sprite[]> = computed(() => spriteStore.list  as Sprite[]);

</script>

<style scoped lang="scss">
@import "@/assets/theme.scss";
.asset-library {
  // TODO: Delete the background, it is just for check the position.
  // background:#f0f0f0;
  .asset-library-left,
  .asset-library-right {
    max-height: calc(60vh - 60px - 24px);
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
