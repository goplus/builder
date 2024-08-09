<template>
  <!-- <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px; height: 100px">
  <SpritePreview v-if="sprite" :sprite="sprite" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px; height: 100px"/>
  </div> -->
  <div class="asset-item">
    <div class="asset-preview-container">
      <div class="asset-preview">
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
      <!-- shown when hovered -->
      <div class="asset-operations">
        <div class="asset-operation" @click.stop="handleFavorite">
          <NIcon v-if="!isFavorite" :size="14" color="#ffffff">
            <HeartOutlined />
          </NIcon>
          <NIcon v-else :size="14" color="#f44336">
            <HeartFilled />
          </NIcon>
          <div class="operation-title">
            {{
              $t(isFavorite ? { en: `Unfavorite`, zh: `取消收藏` } : { en: `Favorite`, zh: `收藏` })
            }}
          </div>
        </div>
        <div
          class="asset-operation"
          :class="{ disabled: addToProjectPending }"
          @click.stop="handleAddToProject"
        >
          <NIcon :size="14" color="#ffffff">
            <PlusOutlined />
          </NIcon>
          <div class="operation-title">
            <!-- {{ $t({ en: `Add to project`, zh: `添加到项目` }) }} -->
            {{
              addToProjectPending
                ? $t({ en: `Adding to project...`, zh: `正在添加..` })
                : $t({ en: `Add to project`, zh: `添加到项目` })
            }}
          </div>
        </div>
      </div>
      <!-- hidden when hovered -->
      <div class="asset-info">
        <div class="asset-info-left">
          <div class="asset-info-item">
            <NIcon color="#ffffff">
              <HeartFilled />
            </NIcon>
            {{ favoriteCount }}
          </div>
          <!-- Rating is not implemented yet -->
          <!-- <div class="asset-info-item">
            <NIcon color="#ffffff">
              <StarOutlined />
            </NIcon>
            {{ 0 }}
          </div> -->
        </div>
        <!-- Maybe we will introduce a marketplace in the future -->
        <!-- <div class="asset-info-right">{{ $t({ en: `FREE`, zh: `免费` }) }}</div> -->
      </div>
    </div>
    <div class="asset-name">
      {{ asset.displayName }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { UILoading } from '@/components/ui'
import { cachedConvertAssetData, type AssetModel } from '@/models/common/asset'
import { useAsyncComputed } from '@/utils/utils'
import {
  type AssetData,
  AssetType,
} from '@/apis/asset'
import SpritePreview from './SpritePreview.vue'
import BackdropPreview from './BackdropPreview.vue'
import SoundPreview from './SoundPreview.vue'
import { NIcon } from 'naive-ui'
import { HeartOutlined, HeartFilled, PlusOutlined /** , StarOutlined */ } from '@vicons/antd'
import { ref } from 'vue'
import { addAssetToFavorites, removeAssetFromFavorites } from '@/apis/user'
import { useMessageHandle } from '@/utils/exception'


const props = defineProps<{
  asset: AssetData
  addToProjectPending: boolean
}>()

const emit = defineEmits<{
  addToProject: [asset: AssetData]
}>()

const assetModel = useAsyncComputed(() => cachedConvertAssetData(props.asset))

const isFavorite = ref(props.asset.isLiked ?? false)
const favoriteCount = ref(props.asset.likeCount ?? 0)

const handleFavorite = () => {
  isFavorite.value = !isFavorite.value
  if (isFavorite.value) {
    //todo: add useMessageHandle
    addAssetToFavorites(props.asset.id)
    favoriteCount.value++
  } else {
    removeAssetFromFavorites(props.asset.id)
    favoriteCount.value--
  }
}

const handleAddToProject = () => {
  if (props.addToProjectPending) {
    return
  }
  emit('addToProject', props.asset)
}
</script>

<style lang="scss" scoped>
$COLUMN_COUNT: 4;
$FLEX_BASIS: calc(90% / $COLUMN_COUNT);

.asset-item {
  flex: 0 1 $FLEX_BASIS;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  color: var(--text-color);
  font-size: 12px;
  text-align: center;
  padding: 0;
  border-radius: 8px;
  background-color: var(--bg-color);
  transition: background-color 0.2s;
}

.asset-item:hover {
  background-color: var(--bg-color-hover);
}

.asset-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;

  border-color: var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  border-radius: 8px;
  overflow: hidden;
}

.asset-preview {
  width: 100%;
  /* calculate the height based on the aspect ratio */
  /* and the child element should be absolutely positioned */
  padding-bottom: 61.8%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.asset-preview > * {
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

.asset-operations {
  display: flex;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
  padding: 8px;
}

.asset-operation {
  height: 24px;
  background-color: #00000077;
  color: #ffffff;
  padding: 0 5px;
  border-radius: 5px;
  display: grid;
  grid-template-columns: 14px 0fr;
  align-items: center;
  transition: grid-template-columns 0.25s ease;
}

.asset-operation.disabled {
  background-color: #2f2f2f77;
  color: #cbd2d8;
}

.asset-operation .operation-title {
  overflow: hidden;
  white-space: nowrap;
  min-width: 0;
}

.asset-operation:hover {
  grid-template-columns: 24px 1fr;
}

.asset-item:hover .asset-operations {
  opacity: 1;
  pointer-events: auto;
}

.asset-info {
  display: flex;
  flex-direction: row;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  align-items: flex-end;
  justify-content: space-between;
  z-index: 0;
  color: #ffffff;
  padding: 4px 8px;
  opacity: 1;
  transition: opacity 0.25s ease;
  // pointer-events: auto;
  pointer-events: none;
}

.asset-info-right,
.asset-info-left {
  height: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.asset-info-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.asset-info::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) calc(100% - 1rem - 16px),
    rgba(0, 0, 0, 0.5) 100%
  );
  z-index: -1;
}

.asset-item:hover .asset-info {
  opacity: 0;
  pointer-events: none;
}
</style>
