<!--
 * @Author: Xu Ning
 * @Date: 2024-01-17 22:51:52
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-02-01 13:32:40
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
          <n-button v-for="category in categories" :key="category" size="large">
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
        <n-grid
          v-if="assetInfos.length != 0"
          cols="3 s:4 m:5 l:6 xl:7 2xl:8"
          responsive="screen"
        >
          <n-grid-item v-for="assetInfo in assetInfos" :key="assetInfo.name">
            <div class="asset-library-sprite-item">
              <!-- S Component Sprite Card -->
              <SpriteCard
                :assetInfo="assetInfo"
                @add-asset="handleAddAsset"
              />
              <!-- S Component Sprite Card -->
            </div>
          </n-grid-item>
        </n-grid>
        <n-empty
          v-else
          class="n-empty-style"
          :show-icon="false"
          size="large"
          description="There's nothing."
        />
      </div>
      <!-- E Library Content -->
    </template>
  </n-modal>
</template>

<script lang="ts" setup>
import { defineEmits, defineProps, ref, watch, onMounted } from "vue";
import {
  NModal,
  NButton,
  NFlex,
  NGrid,
  NGridItem,
  NInput,
  NIcon,
  NEmpty,
} from "naive-ui";
import { FireFilled as hotIcon } from "@vicons/antd";
import { NewReleasesFilled as newIcon } from "@vicons/material";
import type { Asset } from "@/interface/library";
import { AssetType } from "@/constant/constant.ts";
import FileWithUrl from "@/class/FileWithUrl";
import SpriteCard from "./SpriteCard.vue";
import { getAssetList } from "@/api/asset";
import { SpriteInfosMock } from "@/mock/library.ts"

// ----------props & emit------------------------------------
interface propsType {
  show: boolean;
  type: string;
}
const props = defineProps<propsType>();
const emits = defineEmits(["update:show", "add-asset-to-store"]);

// ----------data related -----------------------------------
// Ref about show modal state.
const showModal = ref<boolean>(false);
// Ref about search text.
const searchQuery = ref("");
// Const variable about sprite categories.
// TODO: Get categories from api.
const categories = [
  "ALL",
  "Animals",
  "People",
  "Sports",
  "Food",
  "Fantasy",
];
// Ref about sprite/backdrop information.
const assetInfos = ref<Asset[]>([]);

// ----------lifecycle hooks---------------------------------
// onMounted hook.
onMounted(async () => {
  if (props.type === "backdrop") {
    assetInfos.value = await fetchAssets(AssetType.Backdrop);
  } else if (props.type === "sprite") {
    assetInfos.value = await fetchAssets(AssetType.Sprite);
    // assetInfos.value = SpriteInfosMock
  }
});

// ----------methods-----------------------------------------
/**
 * @description: A function to fetch asset from backend by getAssetList.
 * @param {*} assetType
 * @Author: Xu Ning
 * @Date: 2024-01-25 23:50:45
 */
const fetchAssets = async (assetType: number) => {
  try {
    const pageIndex = 1;
    const pageSize = 20;
    const response = await getAssetList(pageIndex, pageSize, assetType);
    return response.data;
  } catch (error) {
    console.error("Error fetching assets:", error);
    return [];
  }
};

/**
 * @description: Watch the state of show.
 * @Author: Xu Ning
 * @Date: 2024-01-17 23:42:44
 */
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      showModal.value = newShow;
    }
  },
);

/**
 * @description: A function about closing modal.
 * @Author: Xu Ning
 * @Date: 2024-01-17 23:42:57
 */
const closeModalFunc = () => {
  emits("update:show", false);
};

/**
 * @description: A function to emit add object.
 * @param {*} name
 * @Author: Xu Ning
 * @Date: 2024-01-30 11:51:05
 */
const handleAddAsset = (name: string, address: string) => {
  console.log('libraryModal handleAddAsset',name,address)
  emits("add-asset-to-store", name, address);
};
</script>

<style lang="scss">
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
  min-height: 300px;
  .n-empty-style {
    min-height: 300px;
    line-height: 300px;
    .n-empty__description {
      line-height: 300px;
    }
  }
}
.asset-library-sprite-item {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
