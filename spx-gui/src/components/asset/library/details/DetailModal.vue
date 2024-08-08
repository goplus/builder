<template>
  <main>
    <div class="content">
      <div class="display">
        <DetailDisplay v-if="asset.assetType === AssetType.Sprite" :asset="props.asset as AssetData<AssetType.Sprite>"
          class="sprite-detail" />
      </div>
      <div class="detail">
        <LibraryTab />
      </div>
    </div>
    <div class="sider">
      <div class="title">{{ asset.displayName }}</div>
      <div class="button-group">
        <UIButton size="large" class="insert-button" :disabled="addToProjectPending" @click="handleAddButton">
          <span style="white-space: nowrap">
            <!-- {{ $t({ en: 'Insert to project', zh: '插入到项目中' }) }}-->
            {{
              addToProjectPending
                ? $t({ en: 'Pending...', zh: '正在添加...' })
                : $t({ en: 'Add to project', zh: '添加到项目' })
            }}
          </span>
        </UIButton>
        <UIButton size="large" @click="handleToggleFav">
          <span style="white-space: nowrap">
            <!-- {{ $t({ en: 'Favorite', zh: '收藏' }) }} -->
            {{
              isFavorite
                ? $t({ en: 'Unfavorite', zh: '取消收藏' })
                : $t({ en: 'Favorite', zh: '收藏' })
            }}
          </span>
        </UIButton>
      </div>
      <div class="sider-info">
        <div class="basic-info">
          {{ $t({ en: 'posted time', zh: '发布时间' }) }}：{{ displayTime }}
        </div>
        <div class="basic-info">{{ $t({ en: 'posted by', zh: '发布人' }) }}：{{ asset.owner }}</div>
      </div>
      <div class="category">
        <div class="category-title">{{ $t({ en: 'Category', zh: '类别' }) }}</div>
        <NTag class="category-content">{{ asset.category }}</NTag>
      </div>
      <div class="more"></div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NTag } from 'naive-ui'
import { AssetType, type AssetData } from '@/apis/asset'
import UIButton from '@/components/ui/UIButton.vue'
import LibraryTab from '../LibraryTab.vue'
import DetailDisplay from './SpriteDetailDisplay.vue'
import { removeAssetFromFavorites, addAssetToFavorites } from '@/apis/user'

// Define component props
const props = defineProps<{
  asset: AssetData
  addToProjectPending: boolean
}>()

const emit = defineEmits<{
  addToProject: [asset: AssetData]
}>()

const isFavorite = ref(props.asset.isLiked ?? false)
const favoriteCount = ref(props.asset.likeCount ?? 0)

const handleAddButton = () => {
  emit('addToProject', props.asset)
}

const handleToggleFav = () => {
  isFavorite.value = !isFavorite.value
  if (isFavorite.value) {
    favoriteCount.value++
    props.asset.isLiked = true
    props.asset.likeCount = favoriteCount.value
    addAssetToFavorites(props.asset.id)
  } else {
    favoriteCount.value--
    props.asset.isLiked = false
    props.asset.likeCount = favoriteCount.value
    removeAssetFromFavorites(props.asset.id)
  }
}

const displayTime = computed(() => {
  return new Date(props.asset.cTime).toLocaleString()
})
</script>

<style lang="scss" scoped>
header {
  display: flex;
  justify-content: flex-end;
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;

  .close {
    cursor: pointer;
  }
}

main {
  display: flex;

  .content {
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    flex: 1;

    .display {
      width: 100%;
      min-height: 50vh;
      border-right: 1px solid #e0e0e0;
    }

    .detail {
      margin-top: 20px;
      height: 100%;
      padding: 0 20px;
    }
  }

  .sider {
    display: flex;
    flex-direction: column;
    margin: 20px;
    gap: 20px;

    .title {
      font-size: 24px;
      font-weight: bold;
      color: #000;
    }

    .button-group {
      display: flex;
      gap: 10px;

      .insert-button {}
    }

    .sider-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .basic-info {
      font-size: 14px;
    }

    .category {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .category-title {
      font-size: 14px;
      font-weight: bold;
    }

    .category-content {
      font-size: 14px;
      width: fit-content;
    }

    .more {
      margin-top: 20px;
    }
  }
}
</style>
