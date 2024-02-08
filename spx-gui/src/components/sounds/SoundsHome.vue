<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:27:57
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-02-04 13:42:12
 * @FilePath: /builder/spx-gui/src/components/sounds/SoundsHome.vue
 * @Description: Sounds Homepage, includes Edit Part And Card List
-->
<template>
  <n-layout has-sider style="height: calc(100vh - 60px - 54px - 12px)">
    <n-layout-sider
      :native-scrollbar="false"
      content-style="paddingLeft: 130px;"
      style="width: 175px"
    >
      <SoundsEditCard
        v-for="asset in assets"
        :key="asset.id"
        :asset="asset"
        :style="{ 'margin-bottom': '26px' }"
        @click="handleSelect(asset)"
      />
    </n-layout-sider>
    <n-layout-content>
      <SoundsEdit
        :key="componentKey"
        :asset="selectedAsset"
        style="margin-left: 10px"
      />
    </n-layout-content>
  </n-layout>
</template>

<script lang="ts" setup>
import SoundsEditCard from "@/components/sounds/SoundsEditCard.vue";
import { NLayout, NLayoutContent, NLayoutSider } from "naive-ui";
import SoundsEdit from "@/components/sounds/SoundsEdit.vue";
import type { Asset } from "@/interface/library";
import { onMounted, ref } from "vue";
import { getAssetList } from "@/api/asset";
import { AssetType } from "@/constant/constant";

const assets = ref<Asset[]>([]);
const selectedAsset = ref<Asset | null>(null);
const componentKey = ref(0);

onMounted(async () => {
  try {
    assets.value = await fetchAssets(AssetType.Sounds);
    if (assets.value.length > 0) {
      selectedAsset.value = assets.value[0];
    }
  } catch (error) {
    console.error("Error fetching assets:", error);
  }
});

const fetchAssets = async (assetType: number, category?: string) => {
  try {
    const pageIndex = 1;
    const pageSize = 20;
    const response = await getAssetList(pageIndex, pageSize, assetType, category);
    if (response.data.data.data == null)
      return [];
    return response.data.data.data;
  } catch (error) {
    console.error("Error fetching assets:", error);
    return [];
  }
};

const handleSelect = (asset: Asset) => {
  selectedAsset.value = asset;
  componentKey.value++; // Increment the key to force re-creation of SoundsEdit
};

</script>

<style scoped lang="scss">
</style>
