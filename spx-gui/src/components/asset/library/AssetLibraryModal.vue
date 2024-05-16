<template>
  <UISearchableModal
    style="width: 1064px"
    :visible="props.visible"
    :title="$t({ en: `Choose a ${entityMessage.en}`, zh: `选择${entityMessage.zh}` })"
    @update:visible="emit('cancelled')"
  >
    <template #input>
      <UITextInput
        v-model:value="searchInput"
        class="search-input"
        clearable
        :placeholder="$t({ en: 'Search', zh: '搜索' })"
        @keypress.enter="handleSearch"
      >
        <template #prefix><UIIcon class="search-icon" type="search" /></template>
      </UITextInput>
    </template>
    <section class="body">
      <div class="sider">
        <UITag
          :type="category.value === categoryPersonal.value ? 'primary' : 'boring'"
          @click="handleSelectCategory(categoryPersonal)"
        >
          {{ $t(categoryPersonal.message) }}
        </UITag>
        <UIDivider />
        <UITag
          v-for="c in categories"
          :key="c.value"
          :type="c.value === category.value ? 'primary' : 'boring'"
          @click="handleSelectCategory(c)"
        >
          {{ $t(c.message) }}
        </UITag>
      </div>
      <main class="main">
        <h3 class="title">{{ $t(category.message) }}</h3>
        <div class="content">
          <UILoading v-if="isLoading" />
          <UIError v-else-if="error != null" :retry="refetch">
            {{ $t(error.userMessage) }}
          </UIError>
          <UIEmpty v-else-if="assets?.data.length === 0" />
          <ul v-else-if="assets != null && type === AssetType.Sound" class="asset-list">
            <SoundItem
              v-for="asset in assets!.data"
              :key="asset.id"
              :asset="asset"
              :selected="isSelected(asset)"
              @click="handleAssetClick(asset)"
            />
          </ul>
          <ul v-else-if="assets != null && type === AssetType.Sprite" class="asset-list">
            <SpriteItem
              v-for="asset in assets!.data"
              :key="asset.id"
              :asset="asset"
              :selected="isSelected(asset)"
              @click="handleAssetClick(asset)"
            />
          </ul>
          <ul v-else-if="assets != null && type === AssetType.Backdrop" class="asset-list">
            <BackdropItem
              v-for="asset in assets!.data"
              :key="asset.id"
              :asset="asset"
              :selected="isSelected(asset)"
              @click="handleAssetClick(asset)"
            />
          </ul>
        </div>
        <footer class="footer">
          <span v-show="selected.length > 0">
            {{
              $t({
                en: `${selected.length} ${entityMessage.en}${selected.length > 1 ? 's' : ''} selected`,
                zh: `已选中 ${selected.length} 个${entityMessage.zh}`
              })
            }}
          </span>
          <UIButton
            size="large"
            :disabled="selected.length === 0"
            :loading="handleConfirm.isLoading.value"
            @click="handleConfirm.fn"
          >
            {{ $t({ en: 'Confirm', zh: '确认' }) }}
          </UIButton>
        </footer>
      </main>
    </section>
  </UISearchableModal>
</template>

<script lang="ts" setup>
import { computed, defineProps, ref, shallowReactive } from 'vue'
import {
  UITextInput,
  UIIcon,
  UITag,
  UILoading,
  UIEmpty,
  UIError,
  UIButton,
  UISearchableModal,
  UIDivider
} from '@/components/ui'
import { listAsset, AssetType, type AssetData, IsPublic } from '@/apis/asset'
import { useMessageHandle, useQuery } from '@/utils/exception'
import { type Category, categories as categoriesWithoutAll, categoryAll } from './category'
import type { Project } from '@/models/project'
import { asset2Backdrop, asset2Sound, asset2Sprite, type AssetModel } from '@/models/common/asset'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'

const categories = [categoryAll, ...categoriesWithoutAll]

const props = defineProps<{
  type: AssetType
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [AssetModel[]]
}>()

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}

const entityMessage = computed(() => entityMessages[props.type])

const searchInput = ref('')
const keyword = ref('')
// "personal" is not actually a category. Define it as a category for convenience
const categoryPersonal = computed<Category>(() => ({
  value: 'personal',
  message: { en: `My ${entityMessage.value.en}s`, zh: `我的${entityMessage.value.zh}` }
}))
const category = ref(categoryAll)

const {
  isLoading,
  data: assets,
  error,
  refetch
} = useQuery(
  () => {
    const c = category.value.value
    const cPersonal = categoryPersonal.value.value
    return listAsset({
      pageSize: 500, // try to get all
      pageIndex: 1,
      assetType: props.type,
      keyword: keyword.value,
      category: (c === categoryAll.value || c === cPersonal) ? undefined : c,
      owner: c === cPersonal ? undefined : '*',
      isPublic: c === cPersonal ? undefined : IsPublic.public
    })
  },
  {
    en: 'Failed to list',
    zh: '获取列表失败'
  }
)

function handleSearch() {
  keyword.value = searchInput.value
}

function handleSelectCategory(c: Category) {
  category.value = c
}

const selected = shallowReactive<AssetData[]>([])

async function addAssetToProject(asset: AssetData) {
  switch (asset.assetType) {
    case AssetType.Sprite: {
      const sprite = await asset2Sprite(asset)
      props.project.addSprite(sprite)
      await sprite.autoFit()
      return sprite
    }
    case AssetType.Backdrop: {
      const backdrop = await asset2Backdrop(asset)
      // TODO: change `setBackdrop` to `addBackdrop` in #460
      props.project.stage.setBackdrop(backdrop)
      return backdrop
    }
    case AssetType.Sound: {
      const sound = await asset2Sound(asset)
      props.project.addSound(sound)
      return sound
    }
    default:
      throw new Error('unknow asset type')
  }
}

const handleConfirm = useMessageHandle(
  async () => {
    const assetModels = await Promise.all(selected.map(addAssetToProject))
    emit('resolved', assetModels)
  },
  { en: 'Failed to add asset', zh: '素材添加失败' }
)

function isSelected(asset: AssetData) {
  return selected.some((a) => a.id === asset.id)
}

async function handleAssetClick(asset: AssetData) {
  const index = selected.findIndex((a) => a.id === asset.id)
  if (index < 0) selected.push(asset)
  else selected.splice(index, 1)
}
</script>

<style lang="scss" scoped>
.search-input {
  width: 320px;
}
.search-icon {
  color: var(--ui-color-grey-700);
}
.body {
  display: flex;
  justify-content: stretch;
}
.sider {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  padding: var(--ui-gap-middle);
  gap: 12px;

  background: var(--ui-color-grey-200);
}
.main {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
}
.title {
  padding: 20px 24px 0;
  color: var(--ui-color-grey-900);
}
.content {
  height: 513px;
  padding: 8px 24px 0;
  overflow-y: auto;
  overflow-x: visible;
}
.asset-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.footer {
  padding: 20px 24px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--ui-gap-middle);
}
</style>
