<template>
  <UISearchableModal style="width: 1064px" :visible="props.visible" :title="$t(title)">
    <template #input>
      <UITextInput
        v-model:value="searchInput"
        class="search-input"
        :placeholder="$t({ en: 'Search', zh: '搜索' })"
        @keypress.enter="handleSearch"
      >
        <template #prefix><UIIcon class="search-icon" type="search" /></template>
      </UITextInput>
    </template>
    <section class="body">
      <div class="sider">
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
              :active="selectedId === asset.id"
              @click="handleSelect(asset)"
            />
          </ul>
          <ul v-else-if="assets != null && type === AssetType.Sprite" class="asset-list">
            <SpriteItem
              v-for="asset in assets!.data"
              :key="asset.id"
              :asset="asset"
              :active="selectedId === asset.id"
              @click="handleSelect(asset)"
            />
          </ul>
          <ul v-else-if="assets != null && type === AssetType.Backdrop" class="asset-list">
            <BackdropItem
              v-for="asset in assets!.data"
              :key="asset.id"
              :asset="asset"
              :active="selectedId === asset.id"
              @click="handleSelect(asset)"
            />
          </ul>
        </div>
        <footer class="footer">
          <UIButton
            size="large"
            :disabled="selectedId == null"
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
import { computed, defineProps, ref } from 'vue'
import {
  UITextInput,
  UIIcon,
  UITag,
  UILoading,
  UIEmpty,
  UIError,
  UIButton,
  UISearchableModal
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
  resolved: [AssetModel]
}>()

const searchInput = ref('')
const keyword = ref('')
const category = ref(categoryAll)

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}

const title = computed(() => {
  const entityMessage = entityMessages[props.type]
  return {
    en: `Choose a ${entityMessage.en}`,
    zh: `选择${entityMessage.zh}`
  }
})

const {
  isLoading,
  data: assets,
  error,
  refetch
} = useQuery(
  () =>
    listAsset({
      pageSize: 500, // try to get all
      pageIndex: 1,
      assetType: props.type,
      keyword: keyword.value,
      category: category.value.value === categoryAll.value ? undefined : category.value.value,
      owner: '*',
      isPublic: IsPublic.public
    }),
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

const selectedId = ref<string | null>()

const handleConfirm = useMessageHandle(
  async () => {
    const asset =
      selectedId.value != null ? assets.value?.data.find((a) => a.id === selectedId.value) : null
    if (asset == null) return
    switch (asset.assetType) {
      case AssetType.Sprite: {
        const sprite = await asset2Sprite(asset)
        props.project.addSprite(sprite)
        await sprite.autoFit()
        emit('resolved', sprite)
        break
      }
      case AssetType.Backdrop: {
        const backdrop = await asset2Backdrop(asset)
        props.project.stage.setBackdrop(backdrop)
        emit('resolved', backdrop)
        break
      }
      case AssetType.Sound: {
        const sound = await asset2Sound(asset)
        props.project.addSound(sound)
        emit('resolved', sound)
        break
      }
      default:
        throw new Error('unknow asset type')
    }
  },
  { en: 'Failed to add asset', zh: '素材添加失败' }
)

async function handleSelect(asset: AssetData) {
  selectedId.value = asset.id
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
  flex: 0 0 136px;
  display: flex;
  flex-direction: column;
  padding: var(--ui-gap-middle);
  gap: 12px;

  background: var(--ui-color-grey-200);
}
.main {
  padding: 20px 24px;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
}
.title {
  margin-bottom: 8px;
  color: var(--ui-color-grey-900);
}
.content {
  height: 505px;
  overflow-y: auto;
}
.asset-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
