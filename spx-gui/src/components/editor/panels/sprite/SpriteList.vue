<!--
 * @Author: Xu Ning
 * @Date: 2024-01-17 18:11:17
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-13 18:16:35
 * @FilePath: \spx-gui\src\components\sprite-list\SpriteList.vue
 * @Description:
-->
<template>
  <div class="asset-library">
    <div class="asset-library-edit-button">
      {{ _t({ en: 'Sprites', zh: '精灵' }) }}
    </div>

    <div class="asset-btn-group">
      <n-button class="import-assets-btn" @click="showImportModal = true">
        {{ $t('scratch.import') }}
      </n-button>
    </div>

    <n-grid cols="4" item-responsive responsive="screen" style="height: 100%">
      <!-- S Layout Sprite List -->
      <n-grid-item class="asset-library-left" span="3">
        <!-- S Component SpriteEditBtn -->
        <SpriteEditBtn />
        <!-- E Component SpriteEditBtn -->
        <div class="sprite-list-card">
          <n-flex>
            <!-- S Component Add Button -->
            <AssetAddBtn :type="AssetType.Sprite" />
            <!-- E Component Add Button type second step -->
            <!-- S Component ImageCardCom -->
            <ImageCardCom
              v-for="asset in editorCtx.project.sprites"
              :key="asset.name"
              :type="'sprite'"
              :asset="asset"
              :active="asset === editorCtx.selectedSprite"
              @click="toggleCodeById(asset)"
            />
            <!-- E Component ImageCardCom -->
          </n-flex>
        </div>
      </n-grid-item>
      <!-- E Layout Stage List -->
    </n-grid>
    <!-- S Modal Sprite Multi Costume Upload -->
    <n-modal
      v-model:show="showImportModal"
      preset="card"
      :style="bodyStyle"
      header-style="padding:11px 24px 11px 30%;"
      content-style="max-height:70vh;overflow:scroll;"
    >
      <LoadFromScratch />
    </n-modal>
    <!-- E Modal Sprite Multi Costume Upload -->
  </div>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { ref } from 'vue'
import { NGrid, NGridItem, NFlex, NButton, NModal } from 'naive-ui'
import LoadFromScratch from '@/components/library/LoadFromScratch.vue'
import { useEditorCtx } from '@/components/editor/ProjectEditor.vue'
import type { Sprite } from '@/models/sprite'
import { AssetType } from '@/apis/asset'
import SpriteEditBtn from '../todo/SpriteEditBtn.vue'
import ImageCardCom from '../todo/ImageCardCom.vue'
import AssetAddBtn from '../todo/AssetAddBtn.vue'

const editorCtx = useEditorCtx()
const bodyStyle = { margin: 'auto' }

// Ref about show import asset modal or not.
const showImportModal = ref<boolean>(false)

const toggleCodeById = (sprite: Sprite) => {
  editorCtx.select('sprite', sprite.name)
}
</script>

<style scoped lang="scss">
@import '@/assets/theme.scss';

.asset-library {
  height: calc(60vh - 60px - 24px - 24px);
  border: 2px solid #00142970;
  position: relative;
  background: white;
  border-radius: 24px;
  margin: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .asset-library-edit-button {
    background: rgba(255, 170, 0, 0.5);
    width: 80px;
    height: auto;
    text-align: center;
    position: absolute;
    top: -2px;
    left: 8px;
    font-size: 18px;
    border: 2px solid #00142970;
    border-radius: 0 0 10px 10px;
    z-index: 0;
  }
  @mixin libraryRightBase {
    max-height: calc(60vh - 60px - 24px);
    overflow-y: auto;
  }
  .asset-library-right {
    @include libraryRightBase;
    background: white;
    border-left: 2px dashed #8f98a1;
  }
  .asset-library-right-click {
    @include libraryRightBase;
    background: #f7f7f7;
  }

  .asset-library-left {
    margin-top: 30px;
    max-height: calc(60vh - 60px - 24px - 40px);
    overflow: scroll;
    padding: 10px;
  }
}
.entry-code-btn {
  width: 110px;
  height: 110px;
  margin: 10px auto;
  border-radius: 20px;
  border: none;
  background: #ffffff;
  color: #333333;
  box-shadow: 0 0 5px $sprite-list-card-box-shadow;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: visible; // show x button
  cursor: pointer;
}
.asset-btn-group {
  position: absolute;
  left: 108px;
  top: 3px;

  .import-assets-btn {
    height: 24px;
    font-size: 16px;
    color: #333333;
    border-radius: 20px;
    // border: 2px solid rgb(0, 20, 41);
    // box-shadow: rgb(0, 20, 41) -1px 2px;
    cursor: pointer;
    background-color: rgb(255, 248, 204);
    &:hover {
      background-color: rgb(255, 234, 204);
      color: #333333;
    }
  }
}
</style>

<style lang="scss">
@import '@/assets/theme.scss';

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
