<template>
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

<script lang="ts" setup>
import { isContentReady, type TaggedAIAssetData } from '@/apis/aigc'
import type { AssetType } from '@/apis/asset'
import AnimationPlayer from '@/components/editor/sprite/animation/AnimationPlayer.vue'
import { cachedConvertAssetData } from '@/models/common/asset'
import type { SkeletonClip } from '@/models/skeletonAnimation'
import type { Sprite } from '@/models/sprite'
import type { AnimExportData } from '@/utils/ispxLoader'
import { useAsyncComputed } from '@/utils/utils'
import { computed, ref, shallowRef, watch } from 'vue'
import SkeletonEditor from '@/components/asset/animation/skeleton/SkeletonEditor.vue'
import { useFileUrl } from '@/utils/file'
import { NEmpty, NSpin } from 'naive-ui'
import SpriteCarousel from '../details/SpriteCarousel.vue'
import { EditOutlined } from '@vicons/antd'
import type { ButtonType } from '@/components/ui/UIButton.vue'
import type { EditorAction } from './AIPreviewModal.vue'

const props = defineProps<{
  asset: TaggedAIAssetData<AssetType.Sprite>
}>()

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
