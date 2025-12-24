<script lang="ts" setup>
import { computed, ref, shallowReactive, shallowRef, watch } from 'vue'
import { UITextInput, UIPagination, UIButton } from '@/components/ui'
import { listAsset, AssetType, type AssetData, Visibility } from '@/apis/asset'
import { debounce } from 'lodash'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { type Project } from '@/models/project'
import { asset2Backdrop, asset2Sound, asset2Sprite, type AssetModel } from '@/models/common/asset'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import { type Category, categoryAll } from './category'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'
import GenModal from '@/components/asset/gen/common/GenModal.vue'
import SpriteSettingsInput from '@/components/asset/gen/sprite/SpriteSettingsInput.vue'
import BackdropSettingsInput from '@/components/asset/gen/backdrop/BackdropSettingsInput.vue'
import { SpriteGen } from '@/models/gen/sprite-gen'
import { BackdropGen } from '@/models/gen/backdrop-gen'

const props = defineProps<{
  type: AssetType
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [AssetModel[]]
}>()

const ItemComponent = computed(
  () =>
    ({
      [AssetType.Sound]: SoundItem,
      [AssetType.Sprite]: SpriteItem,
      [AssetType.Backdrop]: BackdropItem
    })[props.type]
)

const SettingsInput = computed(
  () =>
    ({
      [AssetType.Sound]: null,
      [AssetType.Sprite]: SpriteSettingsInput,
      [AssetType.Backdrop]: BackdropSettingsInput
    })[props.type]
)
const genProps = computed(
  () =>
    ({
      [AssetType.Sound]: null,
      [AssetType.Sprite]: { gen: new SpriteGen(props.project, keyword.value) },
      [AssetType.Backdrop]: { gen: new BackdropGen(props.project, keyword.value) }
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
      throw new Error('unknown asset type')
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

<template>
  <GenModal
    :radar="{ name: 'Asset library modal', desc: `Modal for choosing ${entityMessage.en}s from the asset library` }"
    style="width: 1096px"
    :visible="props.visible"
    :title="$t({ en: `Choose a ${entityMessage.en}`, zh: `选择${entityMessage.zh}` })"
    @update:visible="emit('cancelled')"
  >
    <header class="header">
      <UITextInput v-model:value="searchInput" :placeholder="$t({ zh: '搜索', en: 'Search' })"></UITextInput>
    </header>
    <main class="main">
      <div
        v-radar="{
          name: 'Asset list',
          desc: `List of ${entityMessage.en}s in the selected category`
        }"
        class="content"
      >
        <ListResultWrapper :query-ret="queryRet" :height="436">
          <template v-if="SettingsInput != null && genProps != null" #empty>
            <div class="empty">
              {{
                $t({
                  zh: `没有找到 ${keyword} 的结果, 可以尝试用 AI 生成吧`,
                  en: `No results for ${keyword}, try to generate with AI`
                })
              }}
              <SettingsInput class="settings-input" v-bind="genProps" />
            </div>
          </template>
          <!-- fixed asset-list height to keep the layout stable -->
          <template #default="slotProps">
            <ul class="asset-list" style="height: 436px">
              <ItemComponent
                v-for="asset in slotProps.data.data"
                :key="asset.id"
                :asset="asset"
                :selected="isSelected(asset)"
                @click="handleAssetClick(asset)"
              />
            </ul>
          </template>
        </ListResultWrapper>
        <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
      </div>
      <footer class="footer">
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
  </GenModal>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  margin-bottom: 26px;
}
.main {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
}
.content {
  padding-top: 8px;
}
.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin: 100px 250px 200px 250px;
  gap: 24px;
  height: 100%;

  .settings-input {
    height: 172px;
  }
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
