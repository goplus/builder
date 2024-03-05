<!--
 * @Author: Xu Ning
 * @Date: 2024-01-17 22:51:52
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-22 14:42:01
 * @FilePath: /builder/spx-gui/src/components/spx-library/LibraryModal.vue
 * @Description:
-->
<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    header-style="padding:11px 24px 11px 30%;"
    content-style="max-height:70vh;overflow:scroll;"
    :on-after-leave="closeModalFunc"
  >
    <!-- S Library Header -->
    <template #header>
      <div style="width: 30vw;">
        <div style="margin-bottom: 1vw;">
          <n-radio-group v-model:value="assetLibraryOption">
            <n-radio-button value="public">
              Public
            </n-radio-button>
            <n-radio-button value="private">
              Private
            </n-radio-button>
          </n-radio-group>
        </div>
        <n-input
          v-model:value="searchQuery"
          size="large"
          placeholder="Search"
          clearable
          round
          @keypress.enter="handleSearch"
        />
      </div>
    </template>
    <!-- E Library Header -->

    <template #default>
      <!-- S Library Sub Header -->
      <div class="asset-library-sub-header">
        <n-flex>
          <n-button
            v-for="category in categories"
            :key="category"
            size="large"
            @click="handleCategoryClick(category)"
          >
            {{ category }}
          </n-button>
          <span class="sort-btn">
            <n-button size="large" circle @click="handleSortByHot">
              <template #icon>
                <n-icon><hotIcon /></n-icon>
              </template>
            </n-button>
            <n-button size="large" circle class="sort-btn-new" @click="handleSortByTime">
              <template #icon>
                <n-icon><newIcon /></n-icon>
              </template>
            </n-button>
          </span>
        </n-flex>
      </div>
      <!-- E Library Sub Header -->
      <!-- S Library Content -->
      <div class="asset-library-content">
        <n-grid v-if="assetInfos != null && assetInfos.length != 0" cols="3 s:4 m:5 l:6 xl:7 2xl:8" responsive="screen">
          <n-grid-item v-for="assetInfo in assetInfos" :key="assetInfo.name">
            <div class="asset-library-sprite-item">
              <!-- S Component Sprite Card -->
              <SpriteCard :asset-info="assetInfo" @add-asset="handleAddAsset" />
              <!-- S Component Sprite Card -->
            </div>
          </n-grid-item>
        </n-grid>
        <n-empty
          v-else
          class="n-empty-style"
          :show-icon="false"
          size="large"
          description="There's nothing."
        />
      </div>
      <!-- E Library Content -->
    </template>
  </n-modal>
</template>

<script lang="ts" setup>
import { defineEmits, defineProps, ref, watch, onMounted, computed } from 'vue'
import { NModal, NButton, NFlex, NGrid, NGridItem, NInput, NIcon, NEmpty, NRadioGroup, NRadioButton } from 'naive-ui'
import { FireFilled as hotIcon } from '@vicons/antd'
import { NewReleasesFilled as newIcon } from '@vicons/material'
import type { Asset } from '@/interface/library'
import { AssetType } from '@/constant/constant'
import SpriteCard from './SpriteCard.vue'
import { searchAssetByName, addAssetClickCount, getAssetList } from '@/api/asset'

// ----------props & emit------------------------------------
interface PropsType {
  show: boolean
  type: string
}
const props = defineProps<PropsType>()
const emits = defineEmits(['update:show', 'add-asset'])

// ----------data related -----------------------------------
const assetLibraryOption = ref<'public' | 'private'>('public')
const baseAssetUrl = computed(() => {
  return assetLibraryOption.value === 'public' ? '/list/asset' : '/list/userasset';
});
// Ref about show modal state.
const showModal = ref<boolean>(false)
// Ref about search text.
const searchQuery = ref('')
// Const variable about sprite categories.
const categories = ['ALL', 'Animals', 'People', 'Sports', 'Food', 'Fantasy']
// Ref about sprite/backdrop information.
const assetInfos = ref<Asset[]|null>()
// Ref about now asset category
const nowCategory = ref<string>('')

// ----------lifecycle hooks---------------------------------
// onMounted hook.
onMounted(async () => {
  await setAssets();
})

// ----------methods-----------------------------------------

/**
 * @description: A function to set asset from backend by props.type.
 * @param {*} assetType
 * @Author: Yao xinyue
 * @Date: 2024-03-05 15:10:45
 */
const setAssets = async() => {
  if (props.type === 'backdrop') {
    assetInfos.value = await fetchAssetsByType(AssetType.Backdrop)
  } else if (props.type === 'sprite') {
    assetInfos.value = await fetchAssetsByType(AssetType.Sprite)
  }
}


/**
 * @description: A function to fetch asset from backend by getAssetList.
 * @param {*} assetType
 * @Author: Xu Ning
 * @Date: 2024-01-25 23:50:45
 */
const fetchAssetsByType = async (assetType: number, category?: string) => {
  try {
    const pageIndex = 1
    const pageSize = 20
    const response = await getAssetList({
      baseAssetUrl: baseAssetUrl.value,
      pageIndex: pageIndex,
      pageSize: pageSize,
      assetType: assetType,
      category: category
    })
    console.log(response, 'response')
    if (response.data.data.data == null) return []
    return response.data.data.data
  } catch (error) {
    console.error('Error fetching assets:', error)
    return []
  }
}

/**
 * @description: Watch the state of show.
 * @Author: Xu Ning
 * @Date: 2024-01-17 23:42:44
 */
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      showModal.value = newShow
    }
  }
)

/**
 * @description: A function about closing modal.
 * @Author: Xu Ning
 * @Date: 2024-01-17 23:42:57
 */
const closeModalFunc = () => {
  emits('update:show', false)
}

/**
 * @description: A function to emit add object.
 * @param {*} name
 * @Author: Xu Ning
 * @Date: 2024-01-30 11:51:05
 */
const handleAddAsset = async (id: number, name: string, address: string) => {
  // TODO add a api to check the click times
  let res =
    props.type === 'backdrop'
      ? await addAssetClickCount(id, AssetType.Backdrop)
      : await addAssetClickCount(id, AssetType.Sprite)
  console.log(res,'handleAddAsset')
  emits('add-asset', name, address)
}

/**
 * @description: A function to search assets by type.
 * @param {*} category - asset type.
 * @return {*}
 * @Author: Xu Ning
 * @Date: 2024-02-06 13:47:05
 */
const handleCategoryClick = async (category: string) => {
  nowCategory.value = category
  if (category === 'ALL') {
    category = ''
  }
  if (props.type === 'backdrop') {
    assetInfos.value = await fetchAssetsByType(AssetType.Backdrop, category)
  } else if (props.type === 'sprite') {
    assetInfos.value = await fetchAssetsByType(AssetType.Sprite, category)
  }
}

/**
 * @description: A function to handle search logic.
 * @return {*}
 * @Author: Xu Ning
 * @Date: 2024-02-06 17:09:03
 */
const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  if (props.type === 'backdrop') {
    let res = await searchAssetByName(searchQuery.value, AssetType.Backdrop)
    if (res.data.data == null) {
      assetInfos.value = []
    } else {
      assetInfos.value = res.data.data
    }
  } else if (props.type === 'sprite') {
    let res = await searchAssetByName(searchQuery.value, AssetType.Sprite)
    if (res.data.data == null) {
      assetInfos.value = []
    } else {
      assetInfos.value = res.data.data
    }
  }
}

/**
 * @description: A function to handle sort by hot.
 * @return {*}
 * @Author: Xu Ning
 * @Date: 2024-02-19 9:09:05
 */
const handleSortByHot = async () => {
  let pageIndex = 1
  let pageSize = 100
  let assetType = props.type === 'backdrop' ? AssetType.Backdrop : AssetType.Sprite
  let res = await getAssetList({
    baseAssetUrl: baseAssetUrl.value,
    pageIndex: pageIndex,
    pageSize: pageSize,
    assetType: assetType,
    category: nowCategory.value,
    isOrderByHot: true
  })
  assetInfos.value = res.data.data.data
}

/**
 * @description: A function to handle sort by time.
 * @return {*}
 * @Author: Xu Ning
 * @Date: 2024-02-19 9:19:01
 */
const handleSortByTime = async () => {
  let pageIndex = 1
  let pageSize = 100
  let assetType = props.type === 'backdrop' ? AssetType.Backdrop : AssetType.Sprite
  let res = await getAssetList({
    baseAssetUrl: baseAssetUrl.value,
    pageIndex: pageIndex,
    pageSize: pageSize,
    assetType: assetType,
    category: nowCategory.value,
    isOrderByTime: true
  })
  assetInfos.value = res.data.data.data
}

/**
 * @description: When public/private change, reset assets
 * @return {*}
 * @Author: Yao xinyue
 * @Date: 2024-03-05 15:01:45
 */
watch(assetLibraryOption, async () => {
  await setAssets();
});

</script>

<style lang="scss">
@import '@/assets/theme.scss';
.asset-library-sub-header {
  background: $asset-library-card-title-2;
  padding: 10px 24px;
  position: absolute;
  width: calc(100% - 48px);
  z-index: 100;
  .sort-btn {
    position: absolute;
    right: 24px;
    .sort-btn-new {
      margin-left: 4px;
    }
  }
}

.asset-library-content {
  margin: 60px 0 20px 0;
  min-height: 300px;
  .n-empty-style {
    min-height: 300px;
    line-height: 300px;
    .n-empty__description {
      line-height: 300px;
    }
  }
}
.asset-library-sprite-item {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
