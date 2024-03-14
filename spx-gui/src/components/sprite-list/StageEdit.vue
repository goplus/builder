<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:08:16
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-13 15:07:40
 * @FilePath: /builder/spx-gui/src/components/sprite-list/BackdropList.vue
 * @Description: 
-->
<template>
  <div class="stage-list" >
    <div :class="isEntryCodeActive ? 'stage-list-title-click' : 'stage-list-title'"  @click="enableEditEntryCode">
      {{ $t('stage.stage') }}
    </div>
    <BackdropList />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EditContentType, useEditorStore } from '@/store'
import BackdropList from '@/components/sprite-list/BackdropList.vue'

// ----------props & emit------------------------------------
const editorStore = useEditorStore()

// ----------computed properties-----------------------------
const isEntryCodeActive = computed(() => editorStore.editContentType === EditContentType.EntryCode)

// ----------methods-----------------------------------------
const enableEditEntryCode = () => {
  editorStore.setEditContentType(EditContentType.EntryCode)
}
</script>

<style scoped lang="scss">
@import '@/assets/theme.scss';
@mixin stageListTitleBase {
  padding: 10px 0;
  cursor: pointer;
}
.stage-list {
  text-align: center;
  height: calc(100% - 20px);
  .stage-list-title {
    @include stageListTitleBase;
  }
  .stage-list-title-click {
    @include stageListTitleBase;
    background: $base-color;
    color: white;
  }
}
</style>
