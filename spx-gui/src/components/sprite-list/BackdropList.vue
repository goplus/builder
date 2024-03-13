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
      <AssetAddBtn :type="'backdrop'" />
      <ImageCardCom :type="'bg'" :asset="backdrop" :style="{ 'margin-bottom': '26px' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useBackdropStore } from '@/store/modules/backdrop'
import ImageCardCom from '@/components/sprite-list/ImageCardCom.vue'
import AssetAddBtn from '@/components/sprite-list/AssetAddBtn.vue'
import { Backdrop } from '@/class/backdrop'

// ----------props & emit------------------------------------
const backdropStore = useBackdropStore()

// ----------computed properties-----------------------------
// Computed backdrop from backdropStore.
const backdrop: ComputedRef<Backdrop> = computed(() => {
  return backdropStore.backdrop as Backdrop
})
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
