<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:08:16
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-13 14:46:09
 * @FilePath: /builder/spx-gui/src/components/sprite-list/BackdropList.vue
 * @Description: 
-->
<template>
  <div class="stage-list">
    <div class="stage-list-space">
      <AssetAddBtn :type="AssetType.Backdrop" />
      <ImageCardCom
        :type="'bg'"
        :asset="projectStore.project.stage"
        :style="{ 'margin-bottom': '26px' }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ImageCardCom from '@/components/editor/sprite-list/ImageCardCom.vue'
import AssetAddBtn from '@/components/editor/sprite-list/AssetAddBtn.vue'
import { useProjectStore } from '@/stores'
import { AssetType } from '@/apis/asset'

// ----------props & emit------------------------------------
const projectStore = useProjectStore()
</script>

<style scoped lang="scss">
.stage-list {
  text-align: center;
  height: calc(100% - 20px);
  padding: 10px;
  .stage-list-space {
    margin: 0 10px;
    overflow-y: auto;
  }
}
</style>
