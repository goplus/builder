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
  useConfirmDialog
} from '@/components/ui'
import { listAsset, AssetType, type AssetData, Visibility } from '@/apis/asset'
import { debounce } from 'lodash'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useWatchResult } from '@/utils/utils'
import { useQuery } from '@/utils/query'
import { type SpxProject } from '@/models/spx/project'
import {
  asset2Backdrop,
  asset2Sound,
  asset2Sprite,
  humanizeAssetType,
  type AssetModel
} from '@/models/spx/common/asset'
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
import { initBackdropGen, initSpriteGen, type GenHelpers } from '../gen/modal'

import genAssetIcon from './gen-asset.svg?raw'
import spriteBanner from './asset-library-sprite-banner.png'
import backdropBanner from './asset-library-backdrop-banner.png'
import soundBanner from './asset-library-sound-banner.png'

const props = defineProps<{
  type: AssetType
  visible: boolean
  project: SpxProject
  genHelpers: GenHelpers
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [AssetModel[]]
}>()

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

const genVersion = ref(0)
function resetGen() {
  genVersion.value++
}

const gen = useWatchResult(
  () => [props.type, props.project, props.genHelpers, genVersion.value] as const, // depend on genVersion so that it resets when genVersion changes
  ([type, project, genHelpers], onCleanup) => {
    if (type === AssetType.Sprite) return initSpriteGen(i18n, project, genHelpers, onCleanup)
    if (type === AssetType.Backdrop) return initBackdropGen(i18n, project, onCleanup)
    if (type === AssetType.Sound) return null
    throw new Error(`Unsupported asset type: ${type}`)
  }
)

// When search results are empty, SettingsInput is shown inline and may modify gen state.
// Reset gen on keyword change to avoid stale state if the user searches again without entering gen phase.
// TODO: Recreating gen on every keyword change might be too frequent. Consider constructing it only when needed.
watch(keyword, resetGen)

const allowBackFromGen = computed(() => {
  if (gen.value instanceof SpriteGen) return gen.value.isPreparePhase
  return true
})

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

const entityMessage = computed(() => humanizeAssetType(props.type))

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
  return (resultTooFew.value || isLastPage.value) && gen.value != null && owner.value === 'all'
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
    const assetModels = await Promise.all(
      selected.map((data) => {
        if (data.type === AssetType.Sprite) return asset2Sprite(data)
        if (data.type === AssetType.Backdrop) return asset2Backdrop(data)
        if (data.type === AssetType.Sound) return asset2Sound(data)
        throw new Error(`Unsupported asset type: ${data.type}`)
      })
    )
    emit('resolved', assetModels)
  },
  { en: 'Failed to parse asset', zh: '素材解析失败' }
)

function isSelected(asset: AssetData) {
  return selected.some((a) => a.id === asset.id)
}

async function handleAssetClick(asset: AssetData) {
  const index = selected.findIndex((a) => a.id === asset.id)
  if (index < 0) selected.push(asset)
  else selected.splice(index, 1)
}

/** If the user is generating an asset. */
const isGenerating = ref(false)

function handleGenStart() {
  isGenerating.value = true
}

// Handle returning from generation to asset library:
// reset search criteria and recreate gen to prevent unexpected intermediate states.
const handleBackFromGen = useMessageHandle(
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
    isGenerating.value = false
    resetGen()
  },
  {
    en: 'Failed to return to asset library',
    zh: '返回素材库失败'
  }
).fn

const modalRef = ref<InstanceType<typeof UIModal> | null>()
async function collapseGen() {
  if (gen.value == null) throw new Error('asset gen expected')
  const genPos = await props.genHelpers.getPos(gen.value)
  if (modalRef.value != null && genPos != null) {
    modalRef.value.setTransformOrigin(genPos)
  }
  emit('cancelled')
}

function handleGenResolved(model: AssetModel) {
  emit('resolved', [model])
}

const GenComp = computed(() => {
  const g = gen.value
  if (g instanceof SpriteGen) {
    return (attrs: Record<string, unknown>) =>
      h(SpriteGenComp, {
        ...attrs,
        gen: g,
        descriptionPlaceholder: keyword.value.trim(),
        onCollapse: collapseGen,
        onResolved: handleGenResolved
      })
  } else if (g instanceof BackdropGen) {
    return (attrs: Record<string, unknown>) =>
      h(BackdropGenComp, {
        ...attrs,
        gen: g,
        descriptionPlaceholder: keyword.value.trim(),
        onResolved: handleGenResolved
      })
  }
  return null
})

const confirm = useConfirmDialog()

const handleModalClose = useMessageHandle(
  async () => {
    if (gen.value == null || !isGenerating.value) {
      emit('cancelled')
      return
    }
    if (!props.genHelpers.isPersisted(gen.value)) {
      // If the gen is not persisted, closing the modal means dropping the current gen,
      // which may cause data loss, so we should confirm with the user.
      const em = entityMessage.value
      await confirm({
        title: i18n.t({ zh: `退出${em.zh}生成？`, en: `Exit ${em.en} generation?` }),
        content: i18n.t({
          zh: '当前内容不会被保存，确定要退出吗？',
          en: 'Current progress will not be saved. Are you sure to exit?'
        }),
        confirmText: i18n.t({ en: 'Exit', zh: '退出' })
      })
      emit('cancelled')
    } else {
      // If the gen is already persisted, we can simply collapse the modal without worrying about data loss.
      return collapseGen()
    }
  },
  { en: 'Failed to exit modal', zh: '退出失败' }
).fn

const title = computed(() => {
  const em = entityMessage.value
  if (isGenerating.value) return { en: `Generate ${em.en}`, zh: `生成${em.zh}` }
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
    <header class="h-14 flex items-center justify-between border-b border-grey-400 px-6">
      <div class="flex items-center gap-middle">
        <UIButton
          v-if="isGenerating && allowBackFromGen"
          class="-rotate-90"
          color="white"
          icon="arrowAlt"
          variant="stroke"
          @click="handleBackFromGen"
        ></UIButton>
        <h2 class="text-16 text-title">{{ $t(title) }}</h2>
      </div>

      <UIModalClose @click="handleModalClose" />
    </header>

    <template v-if="isGenerating && GenComp != null">
      <GenComp class="min-h-0 flex-[1_1_0]" />
    </template>
    <template v-else>
      <div class="min-h-0 flex-[1_1_0] flex flex-col">
        <div class="flex-1 overflow-y-auto">
          <header
            class="h-45 w-full flex flex-col items-center justify-center gap-5 bg-center bg-cover bg-no-repeat px-62.5"
            :style="headerStyle"
          >
            <UITextInput
              v-model:value="searchInput"
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
                <template v-if="SettingsInput != null && gen != null && owner === 'all'" #empty>
                  <div class="mx-auto h-109 flex flex-col items-center gap-6 pt-10">
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
                      class="w-146!"
                      :gen="gen"
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
