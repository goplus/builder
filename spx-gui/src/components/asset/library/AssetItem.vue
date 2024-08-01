<template>
  <!-- <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px; height: 100px">
  <SpritePreview v-if="sprite" :sprite="sprite" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px; height: 100px"/>
  </div> -->
  <div class="asset-item">
    <div class="asset-preview">
      <div class="asset-preview-img">
        <UILoading v-if="!assetModel" cover :mask="false" />
        <SpritePreview
          v-else-if="asset.assetType === AssetType.Sprite"
          :sprite="assetModel as AssetModel<AssetType.Sprite>"
          class="preview sprite-preview"
        />
        <BackdropPreview
          v-else-if="asset.assetType === AssetType.Backdrop"
          :backdrop="assetModel as AssetModel<AssetType.Backdrop>"
          class="preview backdrop-preview"
        />
        <SoundPreview
          v-else-if="asset.assetType === AssetType.Sound"
          :sound="assetModel as AssetModel<AssetType.Sound>"
          class="preview sound-preview"
        />
      </div>
    </div>
    <div class="asset-name">
      {{ asset.displayName }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { UILoading, UISpriteItem } from '@/components/ui'
import { useFileUrl } from '@/utils/file'
import { cachedConvertAssetData, type AssetModel } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import { type AssetData, AssetType } from '@/apis/asset'
import SpritePreview from './SpritePreview.vue'
import BackdropPreview from './BackdropPreview.vue'
import SoundPreview from './SoundPreview.vue'

const props = defineProps<{
  asset: AssetData
  selected: boolean
}>()

const assetModel = useAsyncComputed(() => cachedConvertAssetData(props.asset))
</script>

<style lang="scss" scoped>
$COLUMN_COUNT: 4;
$FLEX_BASIS: calc(100% / $COLUMN_COUNT);
.asset-item {
  flex: 0 1 $FLEX_BASIS;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  color: var(--text-color);
  font-size: 12px;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  background-color: var(--bg-color);
  transition: background-color 0.2s;
}

.asset-item:hover {
  background-color: var(--bg-color-hover);
}

.asset-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
}

.asset-preview-img {
  width: 100%;
  /* calculate the height based on the aspect ratio */
  /* and the child element should be absolutely positioned */
  padding-bottom: 61.8%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.asset-preview-img > * {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-name {
  margin-top: 8px;
}
</style>
