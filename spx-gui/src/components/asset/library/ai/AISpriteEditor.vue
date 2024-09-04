<template>
  <Transition name="slide-fade" mode="out-in" appear>
    <template v-if="!contentReady">
      <div class="generating-info">
        <NSpin :size="64">
          <template #description>
            <Transition name="slide-fade" mode="out-in" appear>
              <span v-if="status === AIGCStatus.Waiting" class="generating-text">
                {{ $t({ en: `Pending...`, zh: `排队中...` }) }}
              </span>
              <span v-else-if="status === AIGCStatus.Generating" class="generating-text">
                {{ $t({ en: `Generating...`, zh: `生成中...` }) }}
              </span>
              <span
                v-else-if="status === AIGCStatus.Finished && !contentReady"
                class="generating-text"
              >
                {{ $t({ en: `Loading...`, zh: `加载中...` }) }}
              </span>
            </Transition>
          </template>
        </NSpin>
      </div>
    </template>
    <template v-else-if="status === AIGCStatus.Failed">
      <div class="failing-info">
        <NIcon color="var(--ui-color-danger-main, #ef4149)" :size="32">
          <CancelOutlined />
        </NIcon>
        <span v-if="status === AIGCStatus.Failed" class="failing-text">
          {{ $t({ en: `Generation failed`, zh: `生成失败` }) }}
        </span>
        <span v-else class="failing-text">
          {{ $t({ en: `Loading failed`, zh: `加载失败` }) }}
        </span>
      </div>
    </template>
    <template v-else>
      <div class="container">
        <SpriteCarousel v-if="sprite" :sprite="sprite" class="sprite-carousel" width="75%" />
        <Transition name="slide-fade" mode="out-in" appear>
          <SkeletonEditor
            v-if="editing && sprite && hasSkeletonAnimation"
            :sprite="sprite"
            class="skeleton-editor"
          />
        </Transition>
      </div>
    </template>
  </Transition>
</template>

<script lang="ts" setup>
import {
  AIGCStatus,
  isContentReady,
  type AIGCFiles,
  type RequiredAIGCFiles,
  type TaggedAIAssetData
} from '@/apis/aigc'
import type { AssetType } from '@/apis/asset'
import AnimationPlayer from '@/components/editor/sprite/animation/AnimationPlayer.vue'
import { cachedConvertAssetData } from '@/models/common/asset'
import type { SkeletonClip } from '@/models/skeletonAnimation'
import type { Sprite } from '@/models/sprite'
import type { AnimationExportData } from '@/utils/ispxLoader'
import { useAsyncComputed } from '@/utils/utils'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import SkeletonEditor from '@/components/asset/animation/skeleton/SkeletonEditor.vue'
import { useFileUrl } from '@/utils/file'
import { NEmpty, NIcon, NSpin } from 'naive-ui'
import SpriteCarousel from '../details/SpriteCarousel.vue'
import { EditOutlined } from '@vicons/antd'
import type { ButtonType } from '@/components/ui/UIButton.vue'
import type { EditorAction } from './AIPreviewModal.vue'
import { AISpriteTask } from '@/models/aigc'
import { getFiles } from '@/models/common/cloud'
import type { File } from '@/models/common/file'
import { hashFileCollection } from '@/models/common/hash'
import { CancelOutlined } from '@vicons/material'

const props = defineProps<{
  asset: TaggedAIAssetData<AssetType.Sprite>
}>()

const emit = defineEmits<{
  contentReady: []
}>()

const status = ref<AIGCStatus | null>(null)
const contentReady = ref(props.asset[isContentReady])

/**
 * Generate content like animation from AI-generated sprite preview
 */
const generateContent = async () => {
  status.value = AIGCStatus.Waiting
  contentReady.value = props.asset[isContentReady]
  const generateTask = new AISpriteTask(props.asset.id)
  generateTask.addEventListener('AIGCStatusChange', () => {
    status.value = generateTask.status
  })
  generateTask.addEventListener('AIGCFinished', () => {
    contentReady.value = true
    if (generateTask.result?.files) {
      loadCloudFiles(generateTask.result.files)
    }
  })
  generateTask.start()
}

const loadCloudFiles = async (cloudFiles: RequiredAIGCFiles) => {
  if (!cloudFiles) {
    status.value = AIGCStatus.Failed
    return
  }
  const files = (await getFiles(cloudFiles)) as {
    [key in keyof AIGCFiles]: File
  }

  if (!files) {
    status.value = AIGCStatus.Failed
    return
  }
  props.asset.files = cloudFiles
  props.asset.filesHash = await hashFileCollection(cloudFiles)
  props.asset.displayName = props.asset.displayName ?? props.asset.id
  props.asset[isContentReady] = true
  contentReady.value = true
  emit('contentReady')
  return
}

onMounted(() => {
  if (!contentReady.value) {
    generateContent()
  }
})

const sprite = useAsyncComputed<Sprite | undefined>(() => {
  if (!props.asset[isContentReady]) {
    return new Promise((resolve) => resolve(undefined))
  }
  return cachedConvertAssetData(props.asset as Required<TaggedAIAssetData<AssetType.Sprite>>)
})

const editing = ref(false)
const hasSkeletonAnimation = computed(() => !!sprite.value?.skeletonAnimation)

const actions = computed(
  () =>
    [
      {
        name: 'edit',
        label: { zh: '编辑', en: 'Edit' },
        icon: EditOutlined,
        type: (editing.value ? 'primary' : 'secondary') satisfies ButtonType,
        action: () => {
          editing.value = !editing.value
        }
      }
    ] satisfies EditorAction[]
)

defineExpose({
  actions
})
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
}

.skeleton-editor {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}



.generating-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.generating-text {
  display: inline-block;
  font-size: 1rem;
  color: var(--ui-color-turquoise-400, #3fcdd9);
}

.failing-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.failing-text {
  display: inline-block;
  font-size: 1rem;
  color: var(--ui-color-danger-main, #ef4149);
}
</style>
