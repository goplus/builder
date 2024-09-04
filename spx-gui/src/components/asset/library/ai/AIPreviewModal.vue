<template>
  <div class="container">
    <div class="head head-actions">
      <Transition name="slide-fade" mode="out-in" appear>
        <div class="head-left">
          <UIButton
            v-for="action in currentActions"
            :key="action.name"
            size="large"
            :type="action.type"
            :disabled="action.disabled"
            @click="action.action"
          >
            <NIcon v-if="action.icon">
              <component :is="action.icon" />
            </NIcon>
            {{ $t(action.label) }}
          </UIButton>
        </div>
      </Transition>
      <div class="head-right">
        <UIButton
          size="large"
          class="insert-button"
          :disabled="!contentReady || addToProjectPending || exportPending"
          @click="handleAddButton"
        >
          <span style="white-space: nowrap">
            {{
              addToProjectPending || exportPending
                ? $t({ en: 'Pending...', zh: '正在添加...' })
                : $t({ en: 'Add to project', zh: '添加到项目' })
            }}
          </span>
        </UIButton>
        <UIButton size="large" :disabled="!contentReady || exportPending" @click="handleRename.fn">
          <span style="white-space: nowrap">
            {{
              isFavorite
                ? $t({ en: 'Unfavorite', zh: '取消收藏' })
                : $t({ en: 'Favorite', zh: '收藏' })
            }}
          </span>
        </UIButton>
      </div>
    </div>
    <div class="content">
      <main>
        <AISpriteEditor
          v-if="asset.assetType === AssetType.Sprite"
          ref="spriteEditor"
          :asset="asset as TaggedAIAssetData<AssetType.Sprite>"
          class="asset-editor sprite-editor"
          @content-ready="contentReady = true"
        />
        <AIBackdropEditor
          v-else-if="asset.assetType === AssetType.Backdrop"
          ref="backdropEditor"
          :asset="asset as TaggedAIAssetData<AssetType.Backdrop>"
          class="asset-editor backdrop-editor"
          @content-ready="contentReady = true"
        />
        <AISoundEditor
          v-else-if="asset.assetType === AssetType.Sound"
          ref="soundEditor"
          :asset="asset"
          @content-ready="contentReady = true"
        />
      </main>
      <aside>
        <NScrollbar
          :content-style="{
            paddingRight: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }"
        >
          <div
            v-for="aiAsset in aiAssets"
            :key="aiAsset.taskId"
            class="ai-asset-wrapper"
            :class="{ selected: aiAsset.result?.id === asset.id }"
          >
            <AIAssetItem
              :task="aiAsset"
              :show-ai-asset-tip="false"
              @ready="(aiAsset as any)[isPreviewReady] = true"
              @click="(aiAsset as any)[isPreviewReady] && emit('selectAi', aiAsset.result!)"
            />
          </div>
        </NScrollbar>
      </aside>
    </div>
  </div>
</template>
<script lang="ts">
export interface EditorAction {
  name: string
  label: LocaleMessage
  type: ButtonType
  disabled?: boolean
  icon?: any
  action: () => void
}
</script>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { NIcon } from 'naive-ui'
import {
  addAsset,
  AssetType,
  getAsset,
  IsPublic,
  type AddAssetParams,
  type AssetData
} from '@/apis/asset'
import UIButton, { type ButtonType } from '@/components/ui/UIButton.vue'
import AIAssetItem from '../AIAssetItem.vue'
import { NScrollbar } from 'naive-ui'
import {
  isContentReady,
  isPreviewReady,
  type TaggedAIAssetData,
  exportedId} from '@/apis/aigc'
import AISpriteEditor from './AISpriteEditor.vue'
import AIBackdropEditor from './AIBackdropEditor.vue'
import AISoundEditor from './AISoundEditor.vue'
import type { LocaleMessage } from '@/utils/i18n'
import { AIGCTask } from '@/models/aigc'
import { useRenameAsset } from '../..'
import { useMessageHandle } from '@/utils/exception'

// Define component props
const props = defineProps<{
  asset: TaggedAIAssetData
  aiAssets: AIGCTask[]
  addToProjectPending: boolean
}>()

const emit = defineEmits<{
  addToProject: [asset: AssetData]
  selectAi: [asset: TaggedAIAssetData]
}>()

const spriteEditor = ref<InstanceType<typeof AISpriteEditor> | null>(null)
const backdropEditor = ref<InstanceType<typeof AIBackdropEditor> | null>(null)
const soundEditor = ref<InstanceType<typeof AISoundEditor> | null>(null)

const currentActions = computed<EditorAction[]>(() => {
  if (
    props.asset.assetType === AssetType.Sprite &&
    spriteEditor.value &&
    'actions' in spriteEditor.value
  ) {
    return spriteEditor?.value?.actions as EditorAction[]
  }
  if (
    props.asset.assetType === AssetType.Backdrop &&
    backdropEditor.value &&
    'actions' in backdropEditor.value
  ) {
    return backdropEditor?.value?.actions as EditorAction[]
  }
  if (
    props.asset.assetType === AssetType.Sound &&
    soundEditor.value &&
    'actions' in soundEditor.value
  ) {
    return soundEditor?.value?.actions as EditorAction[]
  }
  return []
})

const contentReady = ref(props.asset[isContentReady])

const isFavorite = ref(false)
const exportPending = ref(false)

const publicAsset = ref<AssetData | null>(null)

/**
 * Get the public asset data from the asset data
 * If the asset data is not exported, export it first
 */
const exportAssetDataToPublic = async () => {
  if (!props.asset[isContentReady]) {
    throw new Error('Could not export an incomplete asset')
  }
  // let addAssetParam = props.asset
  let addAssetParam: AddAssetParams = {
    ...props.asset,
    isPublic: IsPublic.public,
    files: props.asset.files!,
    displayName: props.asset.displayName ?? props.asset.id,
    filesHash: props.asset.filesHash!,
    preview: 'TODO',
    category: '*'
  }
  exportPending.value = true
  const assetId = props.asset[exportedId] ?? (await addAsset(addAssetParam)).id
  const publicAsset = await getAsset(assetId)
  exportPending.value = false
  return publicAsset
}

const handleAddButton = async () => {
  if (props.addToProjectPending) {
    return
  }

  if (!publicAsset.value) {
    const exportedAsset = await exportAssetDataToPublic()
    publicAsset.value = exportedAsset
  }
  emit('addToProject', publicAsset.value)
}

const renameAsset = useRenameAsset()
const handleRename = useMessageHandle(
  async () => {
    isFavorite.value = !isFavorite.value
    exportPending.value = true
    await renameAsset(props.asset, isFavorite.value)
    exportPending.value = false
  },
  {
    en: 'Failed to rename asset',
    zh: '收藏失败'
  },
  {
    en: 'Successfully renamed asset',
    zh: '收藏成功'
  }
)

const displayTime = computed(() => {
  return new Date(props.asset.cTime).toLocaleString()
})
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  padding-top: 0;
  border-bottom: 1px solid var(--ui-color-dividing-line-2, #cbd2d8);
}

.head-left {
  flex: 1;
  display: flex;
  gap: 10px;
  flex-direction: row;
}

.head-right {
  display: flex;
  gap: 10px;
}

.content {
  display: flex;
  height: 0;
  flex: 1;
  padding: 10px 0 10px 15px;
  padding-top: 0;
}

main {
  flex: 3;
  padding: 10px;
  border-right: 1px solid var(--ui-color-border, #cbd2d8);
  overflow: hidden;
}

aside {
  flex: 1;
  max-width: 250px;
  padding: 10px 0 10px 15px;
}

.ai-asset-wrapper {
  cursor: pointer;
  transition: border-color 0.3s;
  border-radius: calc(3px + var(--ui-border-radius-1));
  border: 3px solid transparent;
}

.ai-asset-wrapper.selected {
  border: 3px solid var(--ui-color-primary-main, #3f9ae5);
  border-radius: calc(3px + var(--ui-border-radius-1));
}
</style>
