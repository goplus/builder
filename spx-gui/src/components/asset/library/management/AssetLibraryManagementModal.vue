<script lang="ts" setup>
import { debounce } from 'lodash'
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { listAsset, AssetType, type AssetData, Visibility, updateAsset, deleteAsset } from '@/apis/asset'
import {
  UITextInput,
  UIIcon,
  UIChip,
  UIPagination,
  UISearchableModal,
  useModal,
  useConfirmDialog,
  useMessage
} from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import { type Category, getAssetCategories, categoryAll } from '../category'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'
import CornerMenu from './AssetItemCornerMenu.vue'
import AssetEditModal from './AssetEditModal.vue'
import VisibilityIcon from './VisibilityIcon.vue'

const props = defineProps<{
  type: AssetType
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
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

const category = ref(categoryAll)

const page = shallowRef(1)
const pageSize = 28 // 7 * 4
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

watch(
  () => [keyword.value, category.value],
  () => (page.value = 1)
)

const queryRet = useQuery(
  () => {
    const c = category.value.value
    return listAsset({
      pageSize,
      pageIndex: page.value,
      type: props.type,
      keyword: keyword.value,
      orderBy: 'displayName',
      category: c === categoryAll.value ? undefined : c
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

const selectedId = ref<string | null>(null)

const i18n = useI18n()
const m = useMessage()
const confirm = useConfirmDialog()

const handlePublish = useMessageHandle(
  async ({ id, ...extra }: AssetData) => {
    await m.withLoading(
      updateAsset(id, { ...extra, visibility: Visibility.Public }),
      i18n.t({ en: 'Making asset public', zh: '设置为公开中' })
    )
    queryRet.refetch()
  },
  {
    en: 'Failed to make asset public',
    zh: '设置为公开失败'
  }
).fn

const handleUnpublish = useMessageHandle(
  async ({ id, ...extra }: AssetData) => {
    await m.withLoading(
      updateAsset(id, { ...extra, visibility: Visibility.Private }),
      i18n.t({ en: 'Making asset private', zh: '设置为私有中' })
    )
    queryRet.refetch()
  },
  {
    en: 'Failed to make asset private',
    zh: '设置为私有失败'
  }
).fn

const invokeEditModal = useModal(AssetEditModal)

const handleEdit = useMessageHandle(
  async (asset: AssetData) => {
    await invokeEditModal({ asset })
    queryRet.refetch()
  },
  {
    en: 'Failed to edit asset',
    zh: '编辑素材失败'
  }
).fn

const handleRemove = useMessageHandle(
  async ({ id, displayName }: AssetData) => {
    await confirm({
      type: 'warning',
      title: i18n.t({
        en: `Remove ${entityMessage.value.en}`,
        zh: `删除${entityMessage.value.zh}`
      }),
      content: i18n.t({
        en: `Are you sure to remove ${displayName}?`,
        zh: `确定要删除 ${displayName} 吗？`
      })
    })
    await m.withLoading(deleteAsset(id), i18n.t({ en: 'Removing asset', zh: '删除素材中' }))
    queryRet.refetch()
  },
  {
    en: 'Failed to remove asset',
    zh: '删除素材失败'
  }
).fn
</script>

<template>
  <UISearchableModal
    :radar="{ name: 'Asset library management modal', desc: 'Modal for managing assets in the library' }"
    style="width: 1244px"
    :visible="props.visible"
    :title="$t({ en: `Manage ${entityMessage.en}s`, zh: `管理${entityMessage.zh}` })"
    @update:visible="emit('cancelled')"
  >
    <template #input>
      <UITextInput
        v-model:value="searchInput"
        v-radar="{ name: 'Search input', desc: 'Input to search library assets' }"
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
        <div class="content">
          <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="584">
            <!-- fixed asset-list height to keep the layout stable -->
            <ul class="asset-list" style="height: 584px">
              <ItemComponent
                v-for="asset in slotProps.data.data"
                :key="asset.id"
                :asset="asset"
                :selected="selectedId === asset.id"
                @click="selectedId = asset.id"
              >
                <VisibilityIcon :visibility="asset.visibility" />
                <CornerMenu
                  v-if="selectedId === asset.id"
                  :asset="asset"
                  @publish="handlePublish(asset)"
                  @unpublish="handleUnpublish(asset)"
                  @edit="handleEdit(asset)"
                  @remove="handleRemove(asset)"
                />
              </ItemComponent>
            </ul>
          </ListResultWrapper>
          <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
        </div>
      </main>
    </section>
  </UISearchableModal>
</template>

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
  padding: 8px 24px 20px;
}
.asset-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-content: flex-start;
}
.pagination {
  justify-content: center;
  margin: 36px 0 0;
}
</style>
