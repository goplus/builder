<script lang="ts" setup>
import { computed, h, ref, shallowReactive, shallowRef, watch, type Component, type CSSProperties } from 'vue'
import {
  UITextInput,
  UIPagination,
  UIButton,
  UIChipRadioGroup,
  UIChipRadio,
  UIIcon,
  UIModal,
  UIModalClose,
  useConfirmDialog
} from '@/components/ui'
import { listAsset, AssetType, type AssetData, Visibility } from '@/apis/asset'
import { debounce } from 'lodash'
import { useI18n } from '@/utils/i18n'
import { capture, useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { type Project } from '@/models/project'
import { asset2Backdrop, asset2Sound, asset2Sprite, type AssetGenModel, type AssetModel } from '@/models/common/asset'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import { getAssetCategories } from './category'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'
import SpriteSettingsInput from '@/components/asset/gen/sprite/SpriteSettingsInput.vue'
import BackdropSettingsInput from '@/components/asset/gen/backdrop/BackdropSettingsInput.vue'
import { SpriteGen } from '@/models/gen/sprite-gen'
import { BackdropGen } from '@/models/gen/backdrop-gen'
import { ownerAll } from '@/apis/common'
import SpriteGenComp from '../gen/sprite/SpriteGen.vue'
import BackdropGenComp from '../gen/backdrop/BackdropGen.vue'

const props = defineProps<{
  type: AssetType
  visible: boolean
  project: Project
}>()

/**
 * AssetLibraryModal may resolve with two types of result:
 * 1. Assets
 * 2. Asset generation process
 */
type Resolved =
  | {
      /**
       * The user selected some existing assets,
       * or finished generating new ones and chose to use them.
       */
      type: 'assets'
      /** The selected or generated assets */
      assets: AssetModel[]
    }
  | {
      /**
       * The user chose to generate new asset(s),
       * and the generation process is not finished yet.
       */
      type: 'gen'
      /** The ongoing generation process */
      gen: AssetGenModel
    }

const emit = defineEmits<{
  cancelled: []
  resolved: [Resolved]
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

const assetGen = shallowRef<AssetGenModel | null>(null)
watch(
  () => props.type,
  (type, _, onCleanup) => {
    assetGen.value = {
      [AssetType.Sound]: null,
      [AssetType.Sprite]: new SpriteGen(props.project, keyword.value),
      [AssetType.Backdrop]: new BackdropGen(props.project, keyword.value)
    }[type]
    const stopKeywordWatch = watch(keyword, (v) => assetGen.value?.setSettings({ description: v }))
    onCleanup(() => {
      stopKeywordWatch()
      assetGen.value?.dispose()
    })
  },
  { immediate: true }
)
/**
 * Prevent assetGen from being disposed automatically.
 * This is useful when the user chooses to collapse the generation process
 * and we need to keep the assetGen instance alive.
 */
function preventAssetGenDisposal(gen: AssetGenModel) {
  if (assetGen.value !== gen) return
  assetGen.value = null
}

const AssetGenComp = computed(() => {
  const gen = assetGen.value
  if (gen == null) return null
  if (gen instanceof SpriteGen) {
    return (props: CSSProperties) =>
      h(SpriteGenComp, {
        ...props,
        gen,
        onCollapse: handleGenCollapse,
        onFinished: handleGenFinished
      })
  } else if (gen instanceof BackdropGen) {
    return (props: CSSProperties) => h(BackdropGenComp, { ...props, gen })
  }
  return null
})

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}
const entityMessage = computed(() => entityMessages[props.type])

// temporary
const recommended = computed(() => getAssetCategories(props.type))
const ownerOptions = {
  all: ownerAll,
  personal: undefined
}
const owner = ref<keyof typeof ownerOptions>('all')

const page = shallowRef(1)
const pageSize = 42 // 7 * 6
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

watch(
  () => [keyword.value, owner.value],
  () => (page.value = 1)
)

const queryRet = useQuery(
  () => {
    return listAsset({
      pageSize,
      pageIndex: page.value,
      type: props.type,
      keyword: keyword.value,
      owner: ownerOptions[owner.value],
      visibility: owner.value === 'personal' ? undefined : Visibility.Public
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
    emit('resolved', {
      type: 'assets',
      assets: assetModels
    })
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

/** If in generation phase */
const isGenPhase = ref(false)

function handleGenStart() {
  isGenPhase.value = true
}

function handleGenCollapse() {
  const gen = assetGen.value
  if (gen == null) throw new Error('asset gen expected')
  preventAssetGenDisposal(gen)
  emit('resolved', {
    type: 'gen',
    gen
  })
}

const handleGenFinished = useMessageHandle(
  async () => {
    const gen = assetGen.value
    if (gen == null) throw new Error('asset gen expected')
    // Consider moving asset addition outside AssetLibraryModal for better separation of concerns.
    // However, this would introduce a delay between the modal close and assets addition, potentially degrading UX.
    // TODO: Review this trade-off
    const added = await props.project.history.doAction(
      {
        name: { en: `Add ${entityMessage.value.en}`, zh: `添加${entityMessage.value.zh}` }
      },
      async () => {
        if (gen instanceof SpriteGen) {
          const sprite = gen.result
          if (sprite == null) throw new Error('sprite generation not finished')
          props.project.addSprite(sprite)
          await sprite.autoFit()
          return sprite
        }
        // TODO: Backdrop handling
        throw new Error('unknown asset type')
      }
    )
    emit('resolved', {
      type: 'assets',
      assets: [added]
    })
  },
  {
    en: 'Failed to generate asset',
    zh: '素材生成失败'
  }
).fn

const i18n = useI18n()
const confirm = useConfirmDialog()

const handleModalClose = useMessageHandle(
  async () => {
    if (isGenPhase.value) {
      // It may be more user-friendly to do collapse automatically, or notify user about collapsing
      // TODO: Review strategy here later
      const em = entityMessage.value
      await confirm({
        title: i18n.t({ zh: `退出${em.zh}生成？`, en: `Exit ${em.en} generation?` }),
        content: i18n.t({
          zh: '当前内容不会被保存，确定要退出吗？',
          en: 'Current progress will not be saved. Are you sure to exit?'
        }),
        confirmText: i18n.t({ en: 'Exit', zh: '退出' })
      })
    }
    assetGen.value?.cancel().catch((e) => capture(e, 'asset generation cancellation failed'))
    emit('cancelled')
  },
  { en: 'Failed to exit modal', zh: '退出失败' }
).fn

const title = computed(() => {
  const em = entityMessage.value
  if (isGenPhase.value) return { en: `Generate ${em.en}`, zh: `生成${em.zh}` }
  return { en: `Choose a ${em.en}`, zh: `选择${em.zh}` }
})
</script>

<template>
  <UIModal
    :radar="{ name: 'Asset library modal', desc: `Modal for choosing ${entityMessage.en}s from the asset library` }"
    style="width: 1096px"
    :visible="visible"
    mask-closable
    @update:visible="handleModalClose"
  >
    <header class="header">
      <div class="header-left">
        <UIButton
          v-if="isGenPhase"
          class="back-asset"
          color="white"
          icon="arrowAlt"
          variant="stroke"
          @click="isGenPhase = false"
        ></UIButton>
        <h2 class="title">{{ $t(title) }}</h2>
      </div>

      <UIModalClose class="close" @click="handleModalClose" />
    </header>

    <template v-if="isGenPhase && AssetGenComp != null">
      <AssetGenComp class="asset-gen" />
    </template>
    <template v-else>
      <div class="asset-library">
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
              desc: `List of ${entityMessage.en}s containing keyword ${keyword}`
            }"
            class="content"
          >
            <div class="filter">
              <UIChipRadioGroup v-model:value="owner">
                <UIChipRadio value="all">{{ $t({ zh: '公开素材库', en: 'Public library' }) }}</UIChipRadio>
                <UIChipRadio value="personal">{{ $t({ zh: '我的素材库', en: 'My library' }) }}</UIChipRadio>
              </UIChipRadioGroup>
            </div>
            <ListResultWrapper :query-ret="queryRet" :height="436">
              <template v-if="SettingsInput != null && assetGen != null && owner === 'all'" #empty>
                <div class="empty">
                  {{
                    $t({
                      zh: `没找到“${keyword}”相关的素材，不如让 AI 帮你生成一个？`,
                      en: `No assets found for "${keyword}". Why not let AI generate one for you?`
                    })
                  }}
                  <SettingsInput :gen="assetGen" @submit="handleGenStart" />
                </div>
              </template>
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
      </div>
    </template>
  </UIModal>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ui-gap-middle) 24px;
  height: 64px;

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--ui-gap-middle);

    .back-asset {
      transform: rotate(-90deg);
    }

    .title {
      font-size: 16px;
      color: var(--ui-color-title);
    }
  }
}

.asset-gen {
  height: 680px; // temporary
}

.asset-library {
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
    padding-top: 40px;
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
}
</style>
