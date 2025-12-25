<script lang="ts" setup>
import { computed, ref, shallowReactive, shallowRef, watch, type Component } from 'vue'
import {
  UITextInput,
  UIPagination,
  UIButton,
  UIChipRadioGroup,
  UIChipRadio,
  UISelect,
  UISelectOption,
  UIIcon
} from '@/components/ui'
import { listAsset, AssetType, type AssetData, Visibility } from '@/apis/asset'
import { debounce } from 'lodash'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { type Project } from '@/models/project'
import { asset2Backdrop, asset2Sound, asset2Sprite, type AssetModel } from '@/models/common/asset'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import { getAssetCategories } from './category'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'
import GenModal from '@/components/asset/gen/common/GenModal.vue'
import SpriteSettingsInput from '@/components/asset/gen/sprite/SpriteSettingsInput.vue'
import BackdropSettingsInput from '@/components/asset/gen/backdrop/BackdropSettingsInput.vue'
import { SpriteGen } from '@/models/gen/sprite-gen'
import { BackdropGen } from '@/models/gen/backdrop-gen'
import { ownerAll } from '@/apis/common'
import SpriteGenView from '../gen/sprite/SpriteGen.vue'
import BackdropGenView from '../gen/backdrop/BackdropGen.vue'
import EnrichableWrapper from '../gen/common/EnrichableWrapper.vue'

const props = defineProps<{
  type: AssetType
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [AssetModel[]]
}>()

const searchInput = ref('')
const keyword = ref('')
watch(
  searchInput,
  debounce(() => {
    keyword.value = searchInput.value
  }, 500)
)

const ItemComponent = computed(
  () =>
    ({
      [AssetType.Sound]: SoundItem,
      [AssetType.Sprite]: SpriteItem,
      [AssetType.Backdrop]: BackdropItem
    })[props.type]
)
const SettingsInput = computed<Component<{ gen: SpriteGen | BackdropGen }> | null>(
  () =>
    ({
      [AssetType.Sound]: null,
      [AssetType.Sprite]: SpriteSettingsInput,
      [AssetType.Backdrop]: BackdropSettingsInput
    })[props.type]
)
const assetGenProps = shallowRef<SpriteGen | BackdropGen | null>(null)
watch(
  () => props.type,
  (type, _, onCleanup) => {
    assetGenProps.value = {
      [AssetType.Sound]: null,
      [AssetType.Sprite]: new SpriteGen(props.project, keyword.value),
      [AssetType.Backdrop]: new BackdropGen(props.project, keyword.value)
    }[type]
    const stopKeywordWatch = watch(keyword, (v) => assetGenProps.value?.setSettings({ description: v }))
    onCleanup(() => {
      stopKeywordWatch()
      assetGenProps.value?.dispose()
    })
  },
  { immediate: true }
)
const AssetGenView = computed<Component<{ gen: SpriteGen | BackdropGen }> | null>(
  () =>
    ({
      [AssetType.Sound]: null,
      [AssetType.Sprite]: SpriteGenView,
      [AssetType.Backdrop]: BackdropGenView
    })[props.type]
)

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}
const entityMessage = computed(() => entityMessages[props.type])

enum Order {
  ByName = 'displayName',
  RecentlyUpdated = 'updatedAt',
  RecentlyCreated = 'createdAt'
}
const order = ref<Order>(Order.ByName)
// temporary
const recommended = computed(() => getAssetCategories(props.type))
const orderOptions = {
  all: ownerAll,
  personal: undefined
}
const owner = ref<keyof typeof orderOptions>('all')

const page = shallowRef(1)
const pageSize = 42 // 7 * 6
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

watch(
  () => [keyword.value, owner.value, order.value],
  () => (page.value = 1)
)

const queryRet = useQuery(
  () => {
    return listAsset({
      pageSize,
      pageIndex: page.value,
      type: props.type,
      keyword: keyword.value,
      orderBy: order.value,
      owner: orderOptions[owner.value],
      visibility: owner.value === 'personal' ? undefined : Visibility.Public
    })
  },
  {
    en: 'Failed to list',
    zh: '获取列表失败'
  }
)
const isEmpty = computed(() => queryRet.data.value?.data?.length === 0)

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

const generatePhase = ref(false)
/**
 * Handles the generate button click in the asset library empty state.
 *
 * Behavior depends on enrichment state:
 * - If enrichment not finished: triggers prompt enrichment via AI
 * - If enrichment finished: transitions to generation phase UI
 */
function handleGenerate() {
  const gen = assetGenProps.value
  if (gen == null) return
  if (gen.enrichState.status !== 'finished') {
    gen.enrich()
    return
  }
  generatePhase.value = true
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
    <template v-if="generatePhase" #left>
      <UIButton
        class="backAsset"
        color="white"
        icon="arrowAlt"
        variant="stroke"
        @click="generatePhase = false"
      ></UIButton>
    </template>
    <template v-if="generatePhase && AssetGenView != null && assetGenProps != null">
      <AssetGenView :gen="assetGenProps" />
    </template>
    <template v-else>
      <header class="header">
        <UITextInput
          v-model:value="searchInput"
          class="search-input"
          color="white"
          size="large"
          clearable
          :placeholder="$t({ zh: '搜索', en: 'Search' })"
          ><template #prefix><UIIcon type="search" /></template
        ></UITextInput>

        <div class="recommended-buttons">
          <UIButton
            v-for="r in recommended"
            :key="r.value"
            variant="stroke"
            color="white"
            size="small"
            @click="searchInput = [searchInput, $t(r.message)].filter(Boolean).join(' ')"
            >{{ $t(r.message) }}</UIButton
          >
        </div>
      </header>

      <main class="main">
        <div
          v-radar="{
            name: 'Asset list',
            desc: `List of ${entityMessage.en}s in the selected category`
          }"
          class="content"
        >
          <div v-if="!isEmpty" class="filter">
            <UIChipRadioGroup v-model:value="owner">
              <UIChipRadio value="all">{{ $t({ zh: '公开素材库', en: 'Public library' }) }}</UIChipRadio>
              <UIChipRadio value="personal">{{ $t({ zh: '我的素材库', en: 'My library' }) }}</UIChipRadio>
            </UIChipRadioGroup>

            <label>
              {{
                $t({
                  en: 'Sort by',
                  zh: '排序方式'
                })
              }}
              <UISelect v-model:value="order">
                <UISelectOption :value="Order.ByName">{{
                  $t({
                    en: 'Name',
                    zh: '名称'
                  })
                }}</UISelectOption>
                <UISelectOption :value="Order.RecentlyUpdated">{{
                  $t({
                    en: 'Recently updated',
                    zh: '最近更新'
                  })
                }}</UISelectOption>
                <UISelectOption :value="Order.RecentlyCreated">{{
                  $t({
                    en: 'Recently created',
                    zh: '最近创建'
                  })
                }}</UISelectOption>
              </UISelect>
            </label>
          </div>
          <ListResultWrapper :query-ret="queryRet" :height="436">
            <template v-if="SettingsInput != null && assetGenProps != null" #empty>
              <div class="empty">
                {{
                  $t({
                    zh: `没找到 “${keyword}” 相关的素材，不如让 AI 帮你生成一个？`,
                    en: `No assets found for "${keyword}". Why not let AI generate one for you?`
                  })
                }}
                <SettingsInput :gen="assetGenProps">
                  <template #submit>
                    <EnrichableWrapper :enriched="assetGenProps.enrichState.status === 'finished'">
                      <UIButton :loading="assetGenProps.enrichState.status === 'running'" @click="handleGenerate">{{
                        $t({ en: 'Generate', zh: '生成' })
                      }}</UIButton>
                    </EnrichableWrapper>
                  </template>
                </SettingsInput>
              </div>
            </template>
            <!-- fixed asset-list height to keep the layout stable -->
            <template #default="slotProps">
              <div class="asset-list-container">
                <ul class="asset-list">
                  <ItemComponent
                    v-for="asset in slotProps.data.data"
                    :key="asset.id"
                    :asset="asset"
                    :selected="isSelected(asset)"
                    @click="handleAssetClick(asset)"
                  />
                </ul>
                <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
              </div>
            </template>
          </ListResultWrapper>
        </div>
        <footer class="footer">
          <UIButton
            v-radar="{ name: 'Confirm button', desc: 'Click to confirm asset selection' }"
            size="large"
            :disabled="selected.length === 0 || isEmpty"
            :loading="handleConfirm.isLoading.value"
            @click="handleConfirm.fn"
          >
            {{ $t({ en: 'Confirm', zh: '确认' }) }}
          </UIButton>
        </footer>
      </main>
    </template>
  </GenModal>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  flex-direction: column;
  height: 180px;
  width: 100%;
  padding: 0 250px;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: url('@/components/asset/library/asset-library-banner.png') no-repeat center center;
  background-size: cover;

  .search-input {
    width: 100%;
    box-shadow: 0 4px 12px 0 rgba(from var(--ui-color-turquoise-300) r g b / 65%);
  }

  .recommended-buttons {
    display: flex;
    gap: 16px;
  }
}
.backAsset {
  transform: rotate(-90deg);
}
.main {
  display: flex;
  flex-direction: column;
  justify-content: stretch;
}
.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px 0 20px;
  overflow-y: auto;
}
.filter {
  display: flex;
  justify-content: space-between;
}
.empty {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding-top: 80px;
  margin: 0 250px;
  gap: 24px;
}
.empty,
.asset-list-container {
  height: 436px;
}
.asset-list {
  display: flex;
  gap: 12px;
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
