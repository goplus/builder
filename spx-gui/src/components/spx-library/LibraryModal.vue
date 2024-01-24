<!--
 * @Author: Xu Ning
 * @Date: 2024-01-17 22:51:52
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-24 12:16:38
 * @FilePath: /builder/spx-gui/src/components/spx-library/LibraryModal.vue
 * @Description: 
-->
<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    header-style="padding:11px 24px 11px 30%;"
    content-style="max-height:70vh;overflow:scroll;"
    :on-after-leave="closeModalFunc"
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
          <n-button size="large" v-for="category in props.categories" :key="category">
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
          <n-grid-item v-for="spriteInfo in props.spriteInfos" :key="spriteInfo.name">
            <div class="asset-library-sprite-item">
              <!-- S Component Sprite Card -->
              <SpriteCard :spriteInfo="spriteInfo" />
              <!-- S Component Sprite Card -->
            </div>
          </n-grid-item>
        </n-grid>
      </div>
      <!-- E Library Content -->
    </template>
  </n-modal>
</template>

<script lang="ts" setup>
import { defineEmits, defineProps, ref, watch } from "vue";
import { NModal, NButton, NFlex, NGrid, NGridItem, NInput, NIcon } from "naive-ui";
import { FireFilled as hotIcon } from "@vicons/antd";
import { NewReleasesFilled as newIcon } from "@vicons/material";
import type { SpriteInfoType } from "@/interface/library";
import SpriteCard from "./SpriteCard.vue";

// ----------props & emit------------------------------------
interface propsType {
  spriteInfos: SpriteInfoType[];
  show: boolean;
  categories: string[];
}
const props = defineProps<propsType>();
const emits = defineEmits(["update:show"]);

// ----------data related -----------------------------------
// Ref about show modal state.
const showModal = ref<boolean>(false);
// Ref about search text.
const searchQuery = ref("");

// ----------methods-----------------------------------------
/**
 * @description: Watch the state of show.
 * @Author: Xu Ning
 * @Date: 2024-01-17 23:42:44
 */
watch(() => props.show, (newShow) => {
  if (newShow) {
    showModal.value = newShow
  }
});

/**
 * @description: A function about closing modal.
 * @Author: Xu Ning
 * @Date: 2024-01-17 23:42:57
 */
const closeModalFunc = () => {
  emits('update:show', false);
}

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

.asset-library-content {
  margin: 60px 0 20px 0;
}
.asset-library-sprite-item {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
