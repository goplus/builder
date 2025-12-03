<template>
  <UISearchableModal
    :radar="{ name: 'Asset library modal', desc: `Modal for choosing ${entityMessage.en}s from the asset library` }"
    style="width: 928px"
    :visible="props.visible"
    :title="$t(modalTitle)"
    @update:visible="handleModalClose"
  >
    <template v-if="!isGenerating" #input>
      <UITabRadioGroup v-model:value="libraryType" class="library-type-selector">
        <UITabRadio :value="LibraryType.Personal">
          {{ $t(personalLibraryMessage) }}
        </UITabRadio>
        <UITabRadio :value="LibraryType.Public">
          {{ $t({ en: 'Public Library', zh: '公开素材库' }) }}
        </UITabRadio>
      </UITabRadioGroup>
    </template>

    <!-- Generator View -->
    <section v-if="isGenerating" class="generator-body">
      <SpriteGenerator
        v-if="props.type === AssetType.Sprite"
        ref="spriteGeneratorRef"
        :project="props.project"
        :settings="generatorSettings"
        :brief="generateDescription"
        @generated="handleSpriteGenerated"
        @hide="handleSpriteGeneratorHide"
      />
      <BackdropGenerator
        v-else-if="props.type === AssetType.Backdrop"
        :project="props.project"
        :settings="generatorSettings"
        :brief="generateDescription"
        @generated="handleBackdropGenerated"
      />
      <SoundGenerator
        v-else-if="props.type === AssetType.Sound"
        :project="props.project"
        :settings="generatorSettings"
        :brief="generateDescription"
        @generated="handleSoundGenerated"
      />
    </section>

    <!-- Library View -->
    <section v-else class="body">
      <main class="main">
        <div v-if="libraryType === LibraryType.Public && !hasSearched" class="search-initial">
          <form class="search-form" @submit.prevent="handleSearch">
            <UITextInput
              v-model:value="searchInput"
              v-radar="{ name: 'Search input', desc: 'Input to search assets' }"
              class="search-input"
              clearable
              :placeholder="$t({ en: 'Search public assets...', zh: '搜索公开素材...' })"
            >
              <template #prefix><UIIcon class="search-icon" type="search" /></template>
            </UITextInput>
            <UIButton type="primary" html-type="submit">
              {{ $t({ en: 'Search', zh: '搜索' }) }}
            </UIButton>
          </form>
        </div>
        <template v-else>
          <form class="search-bar" @submit.prevent="handleSearch">
            <UITextInput
              v-model:value="searchInput"
              v-radar="{ name: 'Search input', desc: 'Input to search assets' }"
              class="search-input"
              clearable
              :placeholder="$t(searchPlaceholder)"
            >
              <template #prefix><UIIcon class="search-icon" type="search" /></template>
            </UITextInput>
            <UIButton type="primary" html-type="submit">
              {{ $t({ en: 'Search', zh: '搜索' }) }}
            </UIButton>
          </form>
          <div
            v-radar="{
              name: 'Asset list',
              desc: `List of ${entityMessage.en}s in the selected category`
            }"
            class="content"
          >
            <ListResultWrapper :query-ret="queryRet" :height="436">
              <template #empty>
                <div class="no-results">
                  <div class="no-results-content">
                    <p class="no-results-title">
                      {{ $t({ en: 'No assets found', zh: '没有找到素材' }) }}
                    </p>
                    <p class="no-results-description">
                      {{ $t({ en: 'Try generating one with AI!', zh: '试试用 AI 生成一个吧！' }) }}
                    </p>
                    <div class="generate-form">
                      <UITextInput v-model:value="generateDescription" class="generate-input" />
                      <UIButton type="primary" size="medium" @click="handleOpenGenerator">
                        {{ $t(generateButtonText) }}
                      </UIButton>
                    </div>
                  </div>
                </div>
              </template>
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
        </template>
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
import {
  UITextInput,
  UIIcon,
  UIPagination,
  UIButton,
  UISearchableModal,
  UITabRadioGroup,
  UITabRadio,
  useConfirmDialog
} from '@/components/ui'
import { listAsset, AssetType, type AssetData, Visibility } from '@/apis/asset'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { type Project } from '@/models/project'
import { asset2Backdrop, asset2Sound, asset2Sprite, type AssetModel, type AssetSettings } from '@/models/common/asset'
import type { Sprite } from '@/models/sprite'
import type { Backdrop } from '@/models/backdrop'
import type { Sound } from '@/models/sound'
import { useI18n } from '@/utils/i18n'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import SoundItem from './SoundItem.vue'
import SpriteItem from './SpriteItem.vue'
import BackdropItem from './BackdropItem.vue'
import SpriteGenerator from './generators/SpriteGenerator.vue'
import { type SpriteGeneration } from './generators/SpriteGeneratorModal.vue'
import BackdropGenerator from './generators/BackdropGenerator.vue'
import SoundGenerator from './generators/SoundGenerator.vue'

const { t } = useI18n()

enum LibraryType {
  Personal = 'personal',
  Public = 'public'
}

const props = defineProps<{
  type: AssetType
  visible: boolean
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [Array<AssetModel | SpriteGeneration>]
}>()

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

const generateButtonText = computed(
  () =>
    ({
      [AssetType.Sprite]: { en: 'Generate Sprite', zh: '生成精灵' },
      [AssetType.Backdrop]: { en: 'Generate Backdrop', zh: '生成背景' },
      [AssetType.Sound]: { en: 'Generate Sound', zh: '生成声音' }
    })[props.type]
)

const isGenerating = ref(false)

const baseTitle = computed(
  () =>
    ({
      [AssetType.Sprite]: { en: 'Choose Sprite', zh: '选择精灵' },
      [AssetType.Backdrop]: { en: 'Choose Backdrop', zh: '选择背景' },
      [AssetType.Sound]: { en: 'Choose Sound', zh: '选择声音' }
    })[props.type]
)

const generatingTitle = computed(
  () =>
    ({
      [AssetType.Sprite]: { en: 'Generate Sprite', zh: '生成精灵' },
      [AssetType.Backdrop]: { en: 'Generate Backdrop', zh: '生成背景' },
      [AssetType.Sound]: { en: 'Generate Sound', zh: '生成声音' }
    })[props.type]
)

const modalTitle = computed(() => (isGenerating.value ? generatingTitle.value : baseTitle.value))

const generatorSettings = computed<AssetSettings>(() => ({
  ...props.project.settings,
  projectDescription: props.project.description ?? props.project.aiDescription ?? null,
  description: generateDescription.value,
  category: null
}))

const confirm = useConfirmDialog()

async function handleModalClose(visible: boolean) {
  if (visible) return

  if (isGenerating.value && props.type === AssetType.Sprite) {
    try {
      await confirm({
        title: t({ en: 'Hide generation?', zh: '收起生成？' }),
        content: t({
          en: 'The sprite is being generated. Do you want to hide and continue in the background?',
          zh: '精灵正在生成中，是否收起并在后台继续？'
        }),
        confirmText: t({ en: 'Hide', zh: '收起' }),
        cancelText: t({ en: 'Discard', zh: '丢弃' })
      })
      // User clicked "Hide"
      handleSpriteGeneratorHide()
    } catch {
      // User clicked "Discard" or closed the dialog
      emit('cancelled')
    }
  } else {
    emit('cancelled')
  }
}

function handleOpenGenerator() {
  isGenerating.value = true
}

async function handleSpriteGenerated(sprite: Sprite) {
  props.project.addSprite(sprite)
  await sprite.autoFit()
  emit('resolved', [sprite])
}

const spriteGeneratorRef = ref<InstanceType<typeof SpriteGenerator>>()

function handleSpriteGeneratorHide() {
  const state = spriteGeneratorRef.value?.getState()
  if (state == null) return
  const generation: SpriteGeneration = {
    type: 'sprite-generation',
    state
  }
  emit('resolved', [generation])
}

function handleBackdropGenerated(backdrop: Backdrop) {
  props.project.stage.addBackdrop(backdrop)
  emit('resolved', [backdrop])
}

function handleSoundGenerated(sound: Sound) {
  props.project.addSound(sound)
  emit('resolved', [sound])
}

const libraryType = ref(LibraryType.Public)
const searchInput = ref('')
const keyword = ref('')
const hasSearched = ref(false)
const generateDescription = ref('')

const personalLibraryMessage = computed(() => ({
  en: `Your ${entityMessage.value.en}s`,
  zh: `你的${entityMessage.value.zh}`
}))

const searchPlaceholder = computed(() =>
  libraryType.value === LibraryType.Personal
    ? { en: 'Search your assets...', zh: '搜索你的素材...' }
    : { en: 'Search public assets...', zh: '搜索公开素材...' }
)

const page = shallowRef(1)
const pageSize = 18 // 6 * 3
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

watch(
  () => [keyword.value, libraryType.value],
  () => (page.value = 1)
)

// Reset search state when switching library type
watch(libraryType, () => {
  searchInput.value = ''
  keyword.value = ''
  hasSearched.value = false
})

// For personal library, auto-search with empty keyword
watch(
  libraryType,
  (type) => {
    if (type === LibraryType.Personal) {
      hasSearched.value = true
    }
  },
  { immediate: true }
)

const queryRet = useQuery(
  () => {
    if (libraryType.value === LibraryType.Public && !hasSearched.value) {
      return Promise.resolve({ data: [], total: 0 })
    }
    return listAsset({
      pageSize,
      pageIndex: page.value,
      type: props.type,
      keyword: keyword.value,
      orderBy: 'displayName',
      owner: libraryType.value === LibraryType.Personal ? undefined : '*',
      visibility: libraryType.value === LibraryType.Personal ? undefined : Visibility.Public
    })
  },
  {
    en: 'Failed to list',
    zh: '获取列表失败'
  }
)

function handleSearch() {
  keyword.value = searchInput.value
  hasSearched.value = true
  generateDescription.value = searchInput.value
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
.library-type-selector {
  margin-left: var(--ui-gap-middle);
  white-space: nowrap;
}

.search-input {
  width: 320px;
}

.search-icon {
  color: var(--ui-color-grey-700);
}

.generator-body {
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.body {
  display: flex;
  justify-content: stretch;
}

.main {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
}

.search-initial {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 500px;
}

.search-form {
  display: flex;
  gap: var(--ui-gap-middle);
  align-items: center;
}

.search-bar {
  display: flex;
  gap: var(--ui-gap-middle);
  align-items: center;
  justify-content: center;
  padding: 20px 24px 12px;
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

.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 436px;
  background: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);
}

.no-results-content {
  text-align: center;
  max-width: 400px;
}

.no-results-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ui-color-title);
  margin: 0 0 8px 0;
}

.no-results-description {
  font-size: 14px;
  color: var(--ui-color-grey-700);
  margin: 0 0 24px 0;
}

.generate-form {
  display: flex;
  gap: var(--ui-gap-middle);
  align-items: center;
  justify-content: center;
}

.generate-input {
  width: 280px;
}
</style>
