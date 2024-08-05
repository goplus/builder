<template>
  <div class="asset-item ai-asset-item">
    <div class="asset-preview-container">
      <div class="asset-preview">
        <template v-if="status !== AIGCStatus.Finished">
          <NSpin>
            <template #description>
              <Transition name="slide-fade" mode="out-in" appear>
                <span v-if="status === AIGCStatus.Waiting" class="generating-text">
                  {{ $t({ en: `Pending...`, zh: `排队中...` }) }}
                </span>
                <span v-else-if="status === AIGCStatus.Generating" class="generating-text">
                  {{ $t({ en: `Generating...`, zh: `生成中...` }) }}
                </span>
              </Transition>
            </template>
          </NSpin>
        </template>
        <template v-else>
          <UIImg class="preview" :src="previewImageSrc" :loading="previewImageLoading" />
        </template>
      </div>
    </div>
    <div class="asset-name">
      <NIcon size="14" color="var(--text-color)">
        <BulbOutlined />
      </NIcon>
      <span class="ai-asset-tip">
        {{ $t({ en: `Created by AI`, zh: `AI 创作` }) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import { NIcon, NSpin } from 'naive-ui'
import { BulbOutlined } from '@vicons/antd'
import { ref } from 'vue'
import { AIGCStatus, getAIGCStatus, type AIAssetData, type AIGCFiles } from '@/apis/aigc'
import { useFileUrl } from '@/utils/file'
import { getFiles } from '@/models/common/cloud'
import type { File } from '@/models/common/file'

const props = defineProps<{
  asset: AIAssetData
}>()

const emit = defineEmits<{
  ready: [asset: AIAssetData]
}>()

const status = ref<AIGCStatus>(AIGCStatus.Waiting)

let previewImageFile = ref<File | undefined>(undefined)
const [previewImageSrc, previewImageLoading] = useFileUrl(() => previewImageFile.value as File)

const POLLING_INTERVAL = 500

const POLLING_MAX_COUNT = (5 * 60 * 1000) / POLLING_INTERVAL

let pollingCount = 0
type RequiredAIGCFiles = Required<AIGCFiles> & { [key: string]: string }
const pollStatus = async () => {
  if (status.value === AIGCStatus.Finished) {
    return
  }
  if (pollingCount >= POLLING_MAX_COUNT) {
    status.value = AIGCStatus.Failed
    return
  }

  pollingCount++

  const newStatus = await getAIGCStatus(props.asset.id)
  status.value = newStatus.status

  if (newStatus.status === AIGCStatus.Finished) {
    const cloudFiles = newStatus.result?.files
    if (!cloudFiles) {
      status.value = AIGCStatus.Failed
      return
    }
    // const files = await getFiles(cloudFiles as Required<AIGCFiles>)
    const files = (await getFiles(cloudFiles as RequiredAIGCFiles)) as {
      [key in keyof AIGCFiles]: File
    }

    if (!files) {
      status.value = AIGCStatus.Failed
      return
    }
    props.asset.preview = cloudFiles.imageUrl
    previewImageFile.value = files.imageUrl
    emit('ready', props.asset)
  }

  if (newStatus.status !== AIGCStatus.Failed) {
    setTimeout(pollStatus, POLLING_INTERVAL)
  }
}

pollStatus()
</script>

<style lang="scss" scoped>
$COLUMN_COUNT: 4;
$FLEX_BASIS: calc(90% / $COLUMN_COUNT);

.asset-item {
  flex: 0 1 $FLEX_BASIS;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  color: var(--text-color);
  font-size: 12px;
  text-align: center;
  padding: 0;
  border-radius: 8px;
  background-color: var(--bg-color);
  transition: background-color 0.2s;
}

.asset-item:hover {
  background-color: var(--bg-color-hover);
}

.asset-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;

  border-color: var(--ui-color-grey-300);
  background-color: var(--ui-color-grey-300);
  border-radius: 8px;
  overflow: hidden;
}

.asset-preview {
  width: 100%;
  /* calculate the height based on the aspect ratio */
  /* and the child element should be absolutely positioned */
  padding-bottom: 61.8%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.asset-preview > * {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-name {
  margin-top: 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;

  //   .ai-asset-tip {
  // 	font-style: italic;
  //   }
}

.generating-text {
  display: inline-block;
  color: var(--ui-color-turquoise-400, #3fcdd9);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-from {
  transform: translateY(10px);
}

.slide-fade-leave-to {
  transform: translateY(-10px);
}
</style>
