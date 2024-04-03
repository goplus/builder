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
      <ImageCardCom :type="'bg'" :asset="editorCtx.project.stage" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ImageCardCom from '../todo/ImageCardCom.vue'
import AssetAddBtn from '../todo/AssetAddBtn.vue'
import { useEditorCtx } from '@/components/editor/ProjectEditor.vue'
import { AssetType } from '@/apis/asset'

const editorCtx = useEditorCtx()
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
