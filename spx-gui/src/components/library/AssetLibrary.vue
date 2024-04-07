<template>
  <div>
    <NInput
      v-model:value="searchInput"
      size="large"
      :placeholder="_t({ en: 'Search', zh: '搜索' })"
      clearable
      round
      @keypress.enter="handleSearch"
    />
    <div>
      <NRadioGroup v-model:value="category">
        <NSpace>
          <NRadio v-for="c in categories" :key="c.value" :value="c.value" :label="_t(c.message)" />
        </NSpace>
      </NRadioGroup>
    </div>
    <div>
      <NRadioGroup v-model:value="ownerType">
        <NSpace>
          <NRadio :value="OwnerType.personal" :label="_t({ en: 'Personal', zh: '个人' })" />
          <NRadio :value="OwnerType.public" :label="_t({ en: 'Public', zh: '公共' })" />
        </NSpace>
      </NRadioGroup>
    </div>
  </div>
  <div>
    <NSpace v-if="isFetching" justify="center">
      <NSpin size="large" />
    </NSpace>
    <NSpace v-else-if="error != null" justify="center">
      {{ _t(error.userMessage) }}
      <button @click="refetch">{{ _t({ en: 'Refresh', zh: '刷新' }) }}</button>
    </NSpace>
    <NEmpty
      v-else-if="assets!.data.length === 0"
      :show-icon="false"
      size="large"
      :description="_t({ en: 'There is nothing', zh: '空空如也' })"
    />
    <ul v-else class="asset-list">
      <li
        v-for="asset in assets!.data"
        :key="asset.id"
        class="asset-item"
        @click="handleAdd(asset)"
      >
        {{ asset.displayName }}
        {{ isAdded(asset) ? '(added)' : null }}
      </li>
    </ul>
    <NPagination v-if="pageCount > 1" v-model:page="pageIndex" :page-count="pageCount" />
  </div>
</template>

<script lang="ts" setup>
import { defineProps, ref, computed, watch, reactive } from 'vue'
import {
  NEmpty,
  NInput,
  NPagination,
  NRadioGroup,
  NRadio,
  NSpace,
  NSpin
} from 'naive-ui'
import { listAsset, AssetType, type AssetData, IsPublic } from '@/apis/asset'
import { useMessageHandle, useQuery } from '@/utils/exception'
import { categories as categoriesWithoutAll, categoryAll } from './category'
import type { Project } from '@/models/project'
import { asset2Backdrop, asset2Sound, asset2Sprite } from '@/models/common'

const categories = [categoryAll, ...categoriesWithoutAll]

const props = defineProps<{
  type: AssetType
  project: Project
}>()

enum OwnerType {
  personal = 0,
  public = 1
}

const pageSize = 20
const pageIndex = ref(1)
const searchInput = ref('')
const keyword = ref('')
const category = ref(categoryAll.value)
const ownerType = ref(OwnerType.personal)

const {
  isFetching,
  data: assets,
  error,
  refetch
} = useQuery(() => listAsset({
  pageSize,
  pageIndex: pageIndex.value,
  assetType: props.type,
  keyword: keyword.value,
  category: category.value === categoryAll.value ? undefined : category.value,
  owner: ownerType.value === OwnerType.personal ? undefined : '*',
  isPublic: ownerType.value === OwnerType.personal ? undefined : IsPublic.public
}), {
  en: 'Failed to list',
  zh: '获取列表失败'
})

const pageCount = computed(() => {
  const total = assets.value?.total ?? 0
  return Math.ceil(total / pageSize)
})

function handleSearch() {
  keyword.value = searchInput.value
  pageIndex.value = 1
}

watch(
  () => [category.value, ownerType.value],
  () => {
    pageIndex.value = 1
  }
)

const added = reactive<string[]>([])

const addAssetToProject = useMessageHandle(
  async (project: Project, asset: AssetData) => {
    switch (asset.assetType) {
      case AssetType.Sprite: {
        const sprite = await asset2Sprite(asset)
        project.addSprite(sprite)
        break
      }
      case AssetType.Backdrop: {
        const backdrop = await asset2Backdrop(asset)
        project.stage.addBackdrop(backdrop)
        break
      }
      case AssetType.Sound: {
        const sprite = await asset2Sound(asset)
        project.addSound(sprite)
        break
      }
      default:
        throw new Error('unknow asset type')
    }
    return asset.displayName
  },
  { en: 'Failed to add asset', zh: '素材添加失败' },
  (name) => ({ en: `Asset ${name} added`, zh: `素材 ${name} 添加成功` })
)

async function handleAdd(asset: AssetData) {
  if (isAdded(asset)) return
  await addAssetToProject(props.project, asset)
  added.push(asset.id)
}

function isAdded(asset: AssetData) {
  return added.includes(asset.id)
}
</script>

<style lang="scss">
.asset-item {
  cursor: pointer;
}
</style>
