<template>
  <UISearchableModal
    :radar="{ name: 'Asset library modal', desc: `Modal for choosing ${entityMessage.en}s from the asset library` }"
    style="width: 1096px"
    :visible="props.visible"
    :title="$t({ en: `Choose a ${entityMessage.en}`, zh: `选择${entityMessage.zh}` })"
    @update:visible="emit('cancelled')"
  >
    <template #input>
      <UITextInput
        v-model:value="searchInput"
        v-radar="{ name: 'Search input', desc: 'Input to search assets' }"
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
        <UIChip
          :type="category.value === categoryPersonal.value ? 'primary' : 'boring'"
          @click="handleSelectCategory(categoryPersonal)"
        >
          {{ $t(categoryPersonal.message) }}
        </UIChip>
        <UIDivider />
        <UIChip
          v-for="c in categories"
          :key="c.value"
          :type="c.value === category.value ? 'primary' : 'boring'"
          @click="handleSelectCategory(c)"
        >
          {{ $t(c.message) }}
        </UIChip>
      </div>
      <main class="main">
        <h3 class="title">{{ $t(category.message) }}</h3>
        <div
          v-radar="{
            name: 'Asset list',
            desc: `List of ${entityMessage.en}s in the selected category`
          }"
          class="content"
        >
          <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="436">
            <!-- fixed asset-list height to keep the layout stable -->
            <ul class="asset-list" style="height: 436px">
              <ItemComponent
                v-for="asset in slotProps.data.data"
                :key="asset.id"
                :asset="asset"
                :selected="isSelected(asset)"
                @click="handleAssetClick(asset)"
              />
            </ul>
          </ListResultWrapper>
          <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
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
            v-radar="{ name: 'Confirm button', desc: 'Click to confirm asset selection' }"
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
import { computed, ref, shallowReactive, shallowRef, watch } from 'vue'
import { UITextInput, UIIcon, UIChip, UIPagination, UIButton, UISearchableModal, UIDivider } from '@/components/ui'
import { listAsset, AssetType, type AssetData, Visibility } from '@/apis/asset'
import { debounce } from 'lodash'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { type Project } from '@/models/project'
import { asset2Backdrop, asset2Sound, asset2Sprite, type AssetModel } from '@/models/common/asset'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import { type Category, getAssetCategories, categoryAll } from './category'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'

const props = defineProps<{
  type: AssetType
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [AssetModel[]]
}>()

const categories = computed(() => {
  const categoriesWithoutAll = getAssetCategories(props.type)
  return [categoryAll, ...categoriesWithoutAll]
})

const ItemComponent = computed(
  () =>
    ({
      [AssetType.Sound]: SoundItem,
      [AssetType.Sprite]: SpriteItem,
      [AssetType.Backdrop]: BackdropItem
    })[props.type]
)

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}

const entityMessage = computed(() => entityMessages[props.type])

const searchInput = ref('')
const keyword = ref('')

// do search (with a delay) when search-input changed
watch(
  searchInput,
  debounce(() => {
    keyword.value = searchInput.value
  }, 500)
)

// "personal" is not actually a category. Define it as a category for convenience
const categoryPersonal = computed<Category>(() => ({
  value: 'personal',
  message: { en: `Your ${entityMessage.value.en}s`, zh: `你的${entityMessage.value.zh}` }
}))
const category = ref(categoryAll)

const page = shallowRef(1)
const pageSize = 18 // 6 * 3
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

watch(
  () => [keyword.value, category.value],
  () => (page.value = 1)
)

const queryRet = useQuery(
  () => {
    const c = category.value.value
    const cPersonal = categoryPersonal.value.value
    return listAsset({
      pageSize,
      pageIndex: page.value,
      type: props.type,
      keyword: keyword.value,
      orderBy: 'displayName',
      category: c === categoryAll.value || c === cPersonal ? undefined : c,
      owner: c === cPersonal ? undefined : '*',
      visibility: c === cPersonal ? undefined : Visibility.Public
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
  switch (asset.type) {
    case AssetType.Sprite: {
      const sprite = await asset2Sprite(asset)
      props.project.addSprite(sprite)
      await sprite.autoFit()
      return sprite
    }
    case AssetType.Backdrop: {
      const backdrop = await asset2Backdrop(asset)
      props.project.stage.addBackdrop(backdrop)
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
    const action = {
      name: { en: `Add ${entityMessage.value.en}`, zh: `添加${entityMessage.value.zh}` }
    }
    const assetModels = await props.project.history.doAction(action, () => Promise.all(selected.map(addAssetToProject)))
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
  flex: 0 0 168px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: var(--ui-gap-middle);
  gap: 12px;

  border-right: 1px solid var(--ui-color-grey-400);
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
  padding: 8px 24px 0;
}
.asset-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-content: flex-start;
}
.pagination {
  justify-content: center;
  margin: 36px 0 12px;
}
.footer {
  padding: 20px 24px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--ui-gap-middle);
}
</style>
