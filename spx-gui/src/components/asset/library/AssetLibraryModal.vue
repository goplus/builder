<script lang="ts">
const searchRecommendations: Record<AssetType, LocaleMessage[]> = {
  [AssetType.Sprite]: [
    { en: 'People', zh: '人物' },
    { en: 'Animals', zh: '动物' },
    { en: 'Fantasy', zh: '幻想' },
    { en: 'UI', zh: '界面' }
  ],
  [AssetType.Backdrop]: [
    { en: 'Grassland', zh: '草地' },
    { en: 'Desert', zh: '沙漠' },
    { en: 'Street', zh: '街道' },
    { en: 'UI', zh: '界面' }
  ],
  [AssetType.Sound]: [
    // TODO: discussion needed
  ]
}
</script>

<script lang="ts" setup>
import { computed, ref, shallowReactive, shallowRef, watch, type Component, h } from 'vue'
import {
  UITextInput,
  UIPagination,
  UIButton,
  UIChipRadioGroup,
  UIChipRadio,
  UIIcon,
  UIModal,
  UIModalClose,
  useConfirmDialog,
  type ModalTransformOrigin
} from '@/components/ui'
import { listAsset, AssetType, type AssetData, Visibility } from '@/apis/asset'
import { debounce } from 'lodash'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { type SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { Backdrop } from '@/models/spx/backdrop'
import { addAssetToProject, type AssetGenModel, type AssetModel } from '@/models/spx/common/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'
import SpriteSettingsInput from '@/components/asset/gen/sprite/SpriteSettingsInput.vue'
import BackdropSettingsInput from '@/components/asset/gen/backdrop/BackdropSettingsInput.vue'
import { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { BackdropGen } from '@/models/spx/gen/backdrop-gen'
import { ownerAll } from '@/apis/common'
import SpriteGenComp from '../gen/sprite/SpriteGen.vue'
import BackdropGenComp from '../gen/backdrop/BackdropGen.vue'
import { useAssetGen } from '../gen/use-asset-gen'

import genAssetIcon from './gen-asset.svg?raw'
import spriteBanner from './asset-library-sprite-banner.png'
import backdropBanner from './asset-library-backdrop-banner.png'
import soundBanner from './asset-library-sound-banner.png'

const props = defineProps<{
  type: AssetType
  visible: boolean
  project: SpxProject
  /**
   * When collapse is triggered, we first need to use genCollapseHandler to implement
   * the logic for collapsing generation (e.g., adding it to the editor-state context),
   * then return the target position for UIModal's closing animation.
   * Finally, the UIModal's cancelled event will be triggered.
   */
  genCollapseHandler: (gen: AssetGenModel) => Promise<ModalTransformOrigin | null>
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [AssetModel[]]
}>()

const editorCtx = useEditorCtx()

const i18n = useI18n()
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

const typeRef = computed(() => props.type)
const { assetGen, keepAlive, reset: resetAssetGen } = useAssetGen(props.project, typeRef)

// When search results are empty, SettingsInput is shown inline and may modify assetGen state.
// Reset assetGen on keyword change to avoid stale state if the user searches again without entering gen phase.
// TODO: Recreating assetGen on every keyword change might be too frequent. Consider constructing it only when needed.
watch(keyword, () => resetAssetGen(props.type))

const backButtonVisible = computed(() => (assetGen.value != null ? assetGen.value.isPreparePhase : false))

const headerStyle = computed(() => {
  const banner = {
    [AssetType.Sprite]: spriteBanner,
    [AssetType.Backdrop]: backdropBanner,
    [AssetType.Sound]: soundBanner
  }[props.type]
  return {
    backgroundImage: `url(${banner})`
  }
})

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}
const entityMessage = computed(() => entityMessages[props.type])

const recommended = computed(() => searchRecommendations[props.type])
const ownerOptions = {
  all: ownerAll,
  personal: undefined
}
const owner = ref<keyof typeof ownerOptions>('all')

const page = shallowRef(1)
const numInRow = 7
const numInColumn = 6
const pageSize = numInRow * numInColumn
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

const resultTooFew = computed(() => {
  const ret = queryRet.data.value
  if (ret == null) return false
  return ret.total <= numInRow // When the result can be displayed in one row (numInRow items per row), show generation suggestions
})
const isLastPage = computed(() => {
  return page.value === pageTotal.value
})
const shouldShowGenSuggestion = computed(() => {
  return (resultTooFew.value || isLastPage.value) && assetGen.value != null && owner.value === 'all'
})
const genSuggestionMessage = computed(() => {
  if (resultTooFew.value) {
    return {
      en: 'Too few related assets. Why not let AI generate one for you?',
      zh: '相关的素材太少，不如让 AI 帮你生成一个？'
    }
  }
  return {
    en: "Reached the end. Still haven't found the right asset? Why not let AI generate one for you?",
    zh: '已经到底了，还没找到合适的素材？不如让 AI 帮你生成一个？'
  }
})

const selected = shallowReactive<AssetData[]>([])

const handleConfirm = useMessageHandle(
  async () => {
    const action = {
      name: { en: `Add ${entityMessage.value.en}`, zh: `添加${entityMessage.value.zh}` }
    }
    const assetModels = await editorCtx.state.history.doAction(action, () =>
      Promise.all(selected.map((asset) => addAssetToProject(asset, props.project)))
    )
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

/** If in generation phase */
const isGenPhase = ref(false)

function handleGenStart() {
  isGenPhase.value = true
}

// Handle returning to the asset library: reset search criteria and recreate assetGen to prevent unexpected intermediate states.
const handleBackToAssetLibrary = useMessageHandle(
  async () => {
    await confirm({
      title: i18n.t({ zh: '返回素材库', en: 'Return to asset library' }),
      content: i18n.t({
        zh: '当前内容不会被保存，确定要返回吗？',
        en: 'Current progress will not be saved. Are you sure to return?'
      }),
      confirmText: i18n.t({ en: 'Return', zh: '返回' })
    })

    searchInput.value = ''
    keyword.value = ''
    isGenPhase.value = false
    resetAssetGen(props.type)
  },
  {
    en: 'Failed to return to asset library',
    zh: '返回素材库失败'
  }
).fn

const modalRef = ref<InstanceType<typeof UIModal> | null>()
async function handleGenCollapse() {
  const gen = assetGen.value
  if (gen == null) throw new Error('asset gen expected')
  keepAlive(gen)
  const transformOrigin = await props.genCollapseHandler(gen)
  if (modalRef.value != null && transformOrigin != null) {
    modalRef.value.setTransformOrigin(transformOrigin)
  }
  emit('cancelled')
}

const handleGenResolved = useMessageHandle(
  async (model: AssetModel) => {
    // Consider moving asset addition outside AssetLibraryModal for better separation of concerns.
    // However, this would introduce a delay between the modal close and assets addition, potentially degrading UX.
    // TODO: Review this trade-off
    await editorCtx.state.history.doAction(
      { name: { en: `Add ${entityMessage.value.en}`, zh: `添加${entityMessage.value.zh}` } },
      async () => {
        if (model instanceof Sprite) {
          props.project.addSprite(model)
          await model.autoFit()
          return
        }
        if (model instanceof Backdrop) {
          props.project.stage.addBackdrop(model)
        }
      }
    )
    emit('resolved', [model])
  },
  { en: 'Failed to add asset', zh: '素材添加失败' }
).fn

const AssetGenComp = computed(() => {
  const gen = assetGen.value
  if (gen == null) return null
  if (gen instanceof SpriteGen) {
    return (attrs: Record<string, unknown>) =>
      h(SpriteGenComp, {
        ...attrs,
        gen,
        descriptionPlaceholder: keyword.value.trim(),
        onCollapse: handleGenCollapse,
        onResolved: handleGenResolved
      })
  } else if (gen instanceof BackdropGen) {
    return (attrs: Record<string, unknown>) =>
      h(BackdropGenComp, {
        ...attrs,
        gen,
        descriptionPlaceholder: keyword.value.trim(),
        onResolved: handleGenResolved
      })
  }
  return null
})

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
    ref="modalRef"
    :radar="{ name: 'Asset library modal', desc: `Modal for choosing ${entityMessage.en}s from the asset library` }"
    style="width: 1076px; height: 800px"
    :visible="visible"
    mask-closable
    @update:visible="handleModalClose"
  >
    <header class="flex h-14 items-center justify-between border-b border-grey-400 px-6">
      <div class="flex items-center gap-middle">
        <UIButton
          v-if="isGenPhase && backButtonVisible"
          class="-rotate-90"
          color="white"
          icon="arrowAlt"
          variant="stroke"
          @click="handleBackToAssetLibrary"
        ></UIButton>
        <h2 class="text-16 text-title">{{ $t(title) }}</h2>
      </div>

      <UIModalClose @click="handleModalClose" />
    </header>

    <template v-if="isGenPhase && AssetGenComp != null">
      <AssetGenComp class="min-h-0 flex-[1_1_0]" />
    </template>
    <template v-else>
      <div class="min-h-0 flex-[1_1_0] flex flex-col">
        <div class="flex-1 overflow-y-auto">
          <header
            class="flex h-45 w-full flex-col items-center justify-center gap-5 bg-center bg-cover bg-no-repeat px-62.5"
            :style="headerStyle"
          >
            <UITextInput
              v-model:value="searchInput"
              class="w-full"
              color="white"
              size="large"
              clearable
              :placeholder="$t({ zh: '搜索', en: 'Search' })"
              :style="{ boxShadow: '0 4px 12px 0 rgba(from var(--ui-color-turquoise-300) r g b / 65%)' }"
            >
              <template #prefix><UIIcon type="search" /></template>
            </UITextInput>

            <div class="flex gap-4">
              <UIButton
                v-for="(r, i) in recommended"
                :key="i"
                variant="stroke"
                color="white"
                size="small"
                @click="searchInput = $t(r)"
              >
                {{ $t(r) }}
              </UIButton>
            </div>
          </header>

          <main class="flex-[1_1_0] flex flex-col justify-stretch">
            <!-- No right padding here to allow the optional scrollbar. -->
            <div
              v-radar="{
                name: 'Asset list',
                desc: `List of ${entityMessage.en}s containing keyword ${keyword}`
              }"
              class="flex-[1_1_0] flex flex-col gap-5 pt-5 pl-6"
            >
              <div class="flex justify-between">
                <UIChipRadioGroup v-model:value="owner">
                  <UIChipRadio value="all">{{ $t({ zh: '公开素材库', en: 'Public library' }) }}</UIChipRadio>
                  <UIChipRadio value="personal">{{ $t({ zh: '我的素材库', en: 'My library' }) }}</UIChipRadio>
                </UIChipRadioGroup>
              </div>
              <ListResultWrapper :query-ret="queryRet" :height="436">
                <template v-if="SettingsInput != null && assetGen != null && owner === 'all'" #empty>
                  <div class="mx-auto flex h-109 flex-col items-center gap-6 pt-10">
                    <div class="text-grey-700">
                      <span>{{ $t({ zh: `没找到`, en: `No assets found for ` }) }}</span>
                      <span class="text-grey-1000">{{ $t({ zh: `“${keyword}”`, en: `"${keyword}"` }) }}</span>
                      <span>
                        {{
                          $t({
                            zh: '相关的素材，不如让 AI 帮你生成一个？',
                            en: '. Why not let AI generate one for you?'
                          })
                        }}
                      </span>
                    </div>
                    <SettingsInput
                      class="w-146"
                      :gen="assetGen"
                      :description-placeholder="keyword"
                      @submit="handleGenStart"
                    />
                  </div>
                </template>
                <template #default="slotProps">
                  <div class="h-109">
                    <ul class="flex flex-wrap content-start gap-2">
                      <ItemComponent
                        v-for="asset in slotProps.data.data"
                        :key="asset.id"
                        :asset="asset"
                        :selected="isSelected(asset)"
                        @click="handleAssetClick(asset)"
                      />
                    </ul>
                    <UIPagination
                      v-show="pageTotal > 1"
                      v-model:current="page"
                      class="mt-9 mb-3 justify-center"
                      :total="pageTotal"
                    />
                    <div v-if="shouldShowGenSuggestion" class="flex flex-col items-center gap-5 py-11">
                      <div class="text-16 text-grey-700">
                        {{ $t(genSuggestionMessage) }}
                      </div>
                      <UIButton size="large" @click="handleGenStart">
                        <template #icon>
                          <!-- eslint-disable-next-line vue/no-v-html -->
                          <div class="h-4.5 w-4.5" v-html="genAssetIcon"></div>
                        </template>
                        {{ $t({ en: 'Generate asset', zh: '生成素材' }) }}
                      </UIButton>
                    </div>
                  </div>
                </template>
              </ListResultWrapper>
            </div>
          </main>
        </div>
        <footer class="flex items-center justify-end gap-middle px-6 py-5">
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
      </div>
    </template>
  </UIModal>
</template>
