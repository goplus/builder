<!--
 * @Author: Xu Ning
 * @Date: 2024-01-17 18:11:17
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-23 15:03:25
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
          <n-flex>
            <!-- S Component Add Button -->
            <SpriteAddBtn :type="'sprite'" />
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
    id: 2,
    name: "cat",
    address:
      "https://ouch-cdn2.icons8.com/IGT5Zlv5RwD3EvQyiXem4rgISKLjSlw9k2PfNTJhps0/rs:fit:368:368/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvOS9i/ODU2Mzg5MS1jZTEy/LTRkYmMtYmY3NS0z/MjY5NDc1MDAwNTku/cG5n.png",
  },
  {
    id: 3,
    name: "chicken",
    address:
      "https://ouch-cdn2.icons8.com/PjdXAGc-QYc1tcSmg7xFgH6aR_RMLCrflDLr8atwpaw/rs:fit:368:349/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvODAz/LzFkOGI1MDU2LTU0/MzMtNDBjMy05MmYz/LWVjMjFlZjEzYjhj/Ni5wbmc.png",
  },
  {
    id: 4,
    name: "pullet",
    address:
      "https://ouch-cdn2.icons8.com/DF-XRInvbvWS9fQSpWc_SegC3meXZK8BmE-PjrdrF3Q/rs:fit:368:396/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvNzI3/LzQyYWIyNzliLWJj/ZDgtNGEyMC04MGRi/LTk3MzU4YWFmNTVk/OS5wbmc.png",
  },
  {
    id: 5,
    name: "stand cat",
    address:
      "https://ouch-cdn2.icons8.com/Abf5hV1fVxcw5rhxiVPO7Ys9hZm70wdPI-1Un0WJHxE/rs:fit:368:362/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvNzY5/L2MyNTg3MDgxLTE1/NzYtNGIwMy05Zjhj/LTkyOWYxNGY2MWI3/Yi5wbmc.png",
  },
  {
    id: 6,
    name: "pig",
    address:
      "https://ouch-cdn2.icons8.com/Gl2K_zUyMcFzrqoOSoW23o2tEThehG1cOvm4FgYf1mQ/rs:fit:368:368/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvNDcv/MDRhZThmZTUtYWQ4/OS00OWFiLWFiYTYt/MjE3MjkwMzg5MmM2/LnBuZw.png",
  },
  {
    id: 7,
    name: "duck",
    address:
      "https://ouch-cdn2.icons8.com/O-AakvilkEvzHQMO05aDTGUX21YUKmR58tsiNb0E4T4/rs:fit:368:368/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvMjc3/L2M5OWExNmFmLTQ4/N2QtNDdkOS04YTVj/LTE2NGUzNjg3Nzg5/OS5wbmc.png",
  },
  {
    id: 8,
    name: "pig",
    address:
      "https://ouch-cdn2.icons8.com/Gl2K_zUyMcFzrqoOSoW23o2tEThehG1cOvm4FgYf1mQ/rs:fit:368:368/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvNDcv/MDRhZThmZTUtYWQ4/OS00OWFiLWFiYTYt/MjE3MjkwMzg5MmM2/LnBuZw.png",
  },
  {
    id: 9,
    name: "duck",
    address:
      "https://ouch-cdn2.icons8.com/O-AakvilkEvzHQMO05aDTGUX21YUKmR58tsiNb0E4T4/rs:fit:368:368/czM6Ly9pY29uczgu/b3VjaC1wcm9kLmFz/c2V0cy9wbmcvMjc3/L2M5OWExNmFmLTQ4/N2QtNDdkOS04YTVj/LTE2NGUzNjg3Nzg5/OS5wbmc.png",
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
