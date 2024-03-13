<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:08:16
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-13 13:13:08
 * @FilePath: /builder/spx-gui/src/components/sprite-list/BackdropList.vue
 * @Description: 
-->
<template>
  <div class="stage-list" @click="enableEditEntryCode">
    <div style="cursor: pointer;">{{ $t('stage.stage') }}</div>
    <div class="stage-list-space">
      <AssetAddBtn :type="'backdrop'" />
      <ImageCardCom :type="'bg'" :asset="backdrop" :style="{ 'margin-bottom': '26px' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type ComputedRef, defineEmits, watch } from 'vue'
import { useBackdropStore } from '@/store/modules/backdrop'
import ImageCardCom from '@/components/sprite-list/ImageCardCom.vue'
import AssetAddBtn from '@/components/sprite-list/AssetAddBtn.vue'
import { Backdrop } from '@/class/backdrop'
import { EditContentType, useEditorStore } from '@/store'


// ----------props & emit------------------------------------
const emits = defineEmits(['entry-code-active-state'])
const backdropStore = useBackdropStore()
const editorStore = useEditorStore()

// ----------computed properties-----------------------------
// Computed backdrop from backdropStore.
const backdrop: ComputedRef<Backdrop> = computed(() => {
  console.log('backdropStore.backdrop', backdropStore.backdrop, backdropStore.backdrop.files)
  return backdropStore.backdrop as Backdrop
})
const isEntryCodeActive = computed(() => editorStore.editContentType === EditContentType.EntryCode)
const enableEditEntryCode = () => {
  editorStore.setEditContentType(EditContentType.EntryCode)
  emits('entry-code-active-state', isEntryCodeActive.value)
}
watch(() => isEntryCodeActive.value, () => {
  emits('entry-code-active-state', isEntryCodeActive.value)
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
