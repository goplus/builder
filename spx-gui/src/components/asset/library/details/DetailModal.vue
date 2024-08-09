<template>
  <main>
    <div class="content">
      <div class="display">
        <DetailDisplay
          v-if="asset.assetType === AssetType.Sprite"
          :asset="props.asset as AssetData<AssetType.Sprite>"
          class="sprite-detail"
        />
      </div>
      <div class="detail">
        <LibraryTab />
      </div>
    </div>
    <div class="sider">
      <div class="title">{{ asset.displayName }}</div>
      <div class="button-group">
        <UIButton
          size="large"
          class="insert-button"
          :disabled="addToProjectPending"
          @click="handleAddButton"
        >
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
      <div class="reviews">
        <div class="rate">
          <div class="rate-title">
            <span class="rate-title-text">
              {{ $t({ en: 'Rating', zh: '评分' }) }}
            </span>
            <div class="rate-title-action open-rate-modal">
              <NButton ref="rateButton" size="small" @click="handleOpenRateModal">
                <template #icon>
                  <NIcon>
                    <StarOutlined />
                  </NIcon>
                </template>
                {{ $t({ zh: '打个分', en: 'Rate it' }) }}
              </NButton>
            </div>
          </div>
          <AssetRate ref="assetRate" :asset="asset" />
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NIcon, NTag } from 'naive-ui'
import { UIModalClose } from '@/components/ui'
import {
  addAssetToFavorites,
  AssetType,
  removeAssetFromFavorites,
  type AssetData
} from '@/apis/asset'
import UIButton from '@/components/ui/UIButton.vue'
import UIModal from '@/components/ui/modal/UIModal.vue'
import LibraryTab from '../LibraryTab.vue'
import DetailDisplay from './SpriteDetailDisplay.vue'
import AssetRate from '../reviews/AssetRate.vue'
import { StarOutlined } from '@vicons/antd'

// Define component props
const props = defineProps<{
  asset: AssetData
  addToProjectPending: boolean
}>()

const emit = defineEmits<{
  addToProject: [asset: AssetData]
}>()

const isFavorite = ref(props.asset.isFavorite ?? false)
const favoriteCount = ref(props.asset.favoriteCount ?? 0)

const handleAddButton = () => {
  emit('addToProject', props.asset)
}

const handleToggleFav = () => {
  isFavorite.value = !isFavorite.value
  if (isFavorite.value) {
    favoriteCount.value++
    props.asset.isFavorite = true
    props.asset.favoriteCount = favoriteCount.value
    removeAssetFromFavorites(props.asset.id)
  } else {
    favoriteCount.value--
    props.asset.isFavorite = false
    props.asset.favoriteCount = favoriteCount.value
    addAssetToFavorites(props.asset.id)
  }
}

const displayTime = computed(() => {
  return new Date(props.asset.cTime).toLocaleString()
})

const assetRate = ref<InstanceType<typeof AssetRate> | null>(null)
const rateButton = ref<InstanceType<typeof NButton> | null>(null)

const handleOpenRateModal = () => {
  assetRate.value?.openRateModal()
  if (
    document.activeElement &&
    'blur' in document.activeElement &&
    typeof document.activeElement.blur === 'function'
  ) {
    document.activeElement.blur()
  }
}
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
}

.content {
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  align-items: center;

  flex: 3;
  padding: 10px;
  border-right: 1px solid var(--ui-color-border, #cbd2d8);
  overflow: hidden;

  .display {
    width: 100%;
    min-height: 50vh;
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
  gap: 20px;

  flex: 1;
  min-width: 275px;
  max-width: 350px;
  padding: 10px 15px 10px 15px;

  .title {
    font-size: 24px;
    font-weight: bold;
    color: #000;
  }

  .button-group {
    display: flex;
    gap: 10px;

    .insert-button {
    }
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

  .rate {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .rate-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .rate-title-text {
      font-size: 16px;
      font-weight: bold;
    }

    .rate-title-action {
      display: flex;
      gap: 10px;
    }
  }
}
</style>
