import SpriteAddBtn from '@/components/sprite-list/SpriteAddBtn.vue';
<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:08:16
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-18 23:35:15
 * @FilePath: /builder/spx-gui/src/components/sprite-list/StageCom.vue
 * @Description: 
-->
<template>
  <div class="stage-list">
    Stage
    <div class="stage-list-space">
      <SpriteAddBtn :type="'bg'" />
      <SpriteCom
        v-for="asset in spriteAssets"
        :key="asset.id"
        :type="'bg'"
        :asset="asset"
        :style="{ 'margin-bottom': '26px' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Asset } from "@/interface/library.ts";
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
