<template>
  <div class="editor-container">
    <Transition name="slide-fade" mode="out-in" appear>
      <template v-if="loadingVisible">
        <div class="generating-info">
          <NSpin :size="64">
            <template #description>
              <Transition name="slide-fade" mode="out-in" appear>
                <span :key="loadingInfoText" class="generating-text">
                  {{ loadingInfoText }}
                </span>
              </Transition>
            </template>
          </NSpin>
        </div>
      </template>
    </Transition>

    <Transition name="slide-fade" mode="out-in" appear>
      <template v-if="status === AIGCStatus.Failed">
        <div class="failing-info">
          <NIcon color="var(--ui-color-danger-main, #ef4149)" :size="32">
            <CancelOutlined />
          </NIcon>
          <span class="failing-text"> {{ failInfoText }} </span>
        </div>
      </template>
    </Transition>

    <div class="container">
      <Transition name="slide-fade" mode="out-in" appear>
        <NImage
          v-if="editMode === 'preview' && previewImageSrc"
          :src="previewImageSrc"
          size="contain"
          class="preview"
        />
        <ImageRepaint
          v-else-if="editMode === 'repaint' && previewImageSrc"
          ref="imageRepaint"
          :image-src="previewImageSrc"
          class="repaint"
        />
        <SpriteCarousel
          v-else-if="contentReady && editMode === 'anim' && sprite"
          :sprite="sprite"
          class="sprite-carousel"
          width="75%"
        />
        <SkeletonEditor
          v-else-if="contentReady && editMode === 'skeleton' && sprite && hasSkeletonAnimation"
          :sprite="sprite"
          class="skeleton-editor"
        />
      </Transition>
    </div>
  </div>
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
import { NEmpty, NIcon, NImage, NSpin } from 'naive-ui'
import SpriteCarousel from '../details/SpriteCarousel.vue'
import { EditOutlined } from '@vicons/antd'
import { AutoFixHighOutlined, DirectionsRunRound } from '@vicons/material'
import type { ButtonType } from '@/components/ui/UIButton.vue'
import type { EditorAction } from './AIPreviewModal.vue'
import { AISpriteTask } from '@/models/aigc'
import { getFiles } from '@/models/common/cloud'
import type { File } from '@/models/common/file'
import { hashFileCollection } from '@/models/common/hash'
import { CancelOutlined } from '@vicons/material'
import { useI18n } from '@/utils/i18n'
import ImageRepaint from './ImageEditor/ImageRepaint.vue'
const { t } = useI18n()

const props = defineProps<{
  asset: TaggedAIAssetData<AssetType.Sprite>
}>()

const emit = defineEmits<{
  contentReady: []
}>()

const imageRepaint = ref<InstanceType<typeof ImageRepaint> | null>(null)
const activeEditor = computed(
  () =>
    ({
      preview: null,
      repaint: imageRepaint.value,
      anim: null,
      skeleton: null,
    })[editMode.value]
)

const status = ref<AIGCStatus | null>(null)
const contentReady = ref(props.asset[isContentReady])

const loadingVisible = computed(() => {
  return (
    (status.value !== null &&
      (status.value === AIGCStatus.Waiting ||
        status.value === AIGCStatus.Generating ||
        (!contentReady.value && status.value === AIGCStatus.Finished))) ||
    previewImageLoading.value
  )
})

const loadingInfoText = computed(() => {
  if (status.value === AIGCStatus.Waiting) {
    return t({ en: `Pending...`, zh: `排队中...` })
  } else if (status.value === AIGCStatus.Generating) {
    return t({ en: `Generating...`, zh: `生成中...` })
  } else if (status.value === AIGCStatus.Finished && !contentReady.value) {
    return t({ en: `Loading...`, zh: `加载中...` })
  } else if (previewImageLoading.value) {
    return t({ en: `Loading preview...`, zh: `加载预览...` })
  }
  return ''
})

const failInfoText = ref(t({ en: `Generation failed`, zh: `生成失败` }))

let previewImageFile = useAsyncComputed<File | undefined>(async () => {
  if (props.asset.files?.imageUrl) {
    const files = await getFiles({ imageUrl: props.asset.files.imageUrl })
    if (files) {
      return files.imageUrl
    } else {
      status.value = AIGCStatus.Failed
      failInfoText.value = t({ en: `Failed to load preview`, zh: `加载预览失败` })
    }
  }
  return new Promise((resolve) => resolve(undefined))
})

const [previewImageSrc, previewImageLoading] = useFileUrl(() => previewImageFile.value)

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
    if (generateTask.result?.files) {
      contentReady.value = true
      loadCloudFiles(generateTask.result.files)
    } else {
      status.value = AIGCStatus.Failed
      failInfoText.value = t({ en: `Failed to generate content`, zh: `生成内容失败` })
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

const sprite = useAsyncComputed<Sprite | undefined>(() => {
  if (!props.asset[isContentReady]) {
    return new Promise((resolve) => resolve(undefined))
  }
  return cachedConvertAssetData(props.asset as Required<TaggedAIAssetData<AssetType.Sprite>>)
})

// preview : view preview image
// repaint : repaint preview image
// view : view sprite
// edit : edit skeleton animation
type EditMode = 'preview' | 'repaint' | 'anim' | 'skeleton'
const editMode = ref<EditMode>('preview')
const hasSkeletonAnimation = computed(() => !!sprite.value?.skeletonAnimation)

const actions = computed(() =>
  (
    [
      editMode.value === 'preview' && {
        name: 'repaint',
        label: { zh: '重绘', en: 'Repaint' },
        icon: AutoFixHighOutlined,
        type: 'secondary' satisfies ButtonType,
        action: () => {
          editMode.value = editMode.value === 'repaint' ? 'preview' : 'repaint'
        }
      },
      editMode.value === 'repaint' && {
        name: 'repaint',
        label: { zh: '重绘', en: 'Repaint' },
        icon: AutoFixHighOutlined,
        type: 'primary' satisfies ButtonType,
        action: () => {
          activeEditor.value?.inpaint()
        }
      },
      {
        name: 'generate-anim',
        label: { zh: '动画', en: 'Animation' },
        icon: DirectionsRunRound,
        type: 'secondary' satisfies ButtonType,
        action: async () => {
          await generateContent()
          editMode.value = 'anim'
        }
      },
      contentReady.value && {
        name: 'edit',
        label: { zh: '编辑', en: 'Edit' },
        icon: EditOutlined,
        type: (editMode.value === 'skeleton' ? 'primary' : 'secondary') satisfies ButtonType,
        action: () => {
          editMode.value = editMode.value === 'skeleton' ? 'anim' : 'skeleton'
        }
      }
    ] satisfies (EditorAction | false)[]
  ).filter(Boolean)
)

defineExpose({
  actions
})
</script>

<style scoped>
.editor-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.skeleton-editor {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.generating-info {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
