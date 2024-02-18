<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:08:16
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-02-06 17:58:24
 * @FilePath: /builder/spx-gui/src/components/sprite-list/BackdropList.vue
 * @Description: 
-->
<template>
  <div class="stage-list">
    {{ $t('stage.stage') }}
    <div class="stage-list-space">
      <SpriteAddBtn :type="'backdrop'" />
      <ImageCardCom :type="'bg'" :asset="backdrop" :style="{ 'margin-bottom': '26px' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useBackdropStore } from '@/store/modules/backdrop'
import ImageCardCom from '@/components/sprite-list/ImageCardCom.vue'
import SpriteAddBtn from '@/components/sprite-list/SpriteAddBtn.vue'
import { Backdrop } from '@/class/backdrop'

// ----------props & emit------------------------------------
const backdropStore = useBackdropStore()

// ----------computed properties-----------------------------
// Computed backdrop from backdropStore.
const backdrop: ComputedRef<Backdrop> = computed(() => {
  console.log('backdropStore.backdrop', backdropStore.backdrop,backdropStore.backdrop.files)
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
    height: calc(100% - 40px);
    overflow: scroll;
  }
}
</style>
