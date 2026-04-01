<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIModal, UIModalClose, useConfirmDialog, type ModalTransformOrigin } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { AssetType } from '@/apis/asset'
import type { Sprite } from '@/models/spx/sprite'
import type { SpriteGen as SpriteGenModel } from '@/models/spx/gen/sprite-gen'
import type { SpxProject } from '@/models/spx/project'
import type { AssetGenModel } from '@/models/spx/common/asset'
import { useAssetGen } from '../use-asset-gen'
import SpriteGenComp from './SpriteGen.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    project: SpxProject
    gen?: SpriteGenModel
    genCollapseHandler: (gen: AssetGenModel, isNewGen?: boolean) => Promise<ModalTransformOrigin | null>
  }>(),
  {
    gen: undefined
  }
)

const emit = defineEmits<{
  resolved: [Sprite]
  cancelled: []
}>()

const i18n = useI18n()
const confirm = useConfirmDialog()

const typeRef = computed(() => (props.gen != null ? null : AssetType.Sprite))
const { assetGen: internalGen, keepAlive } = useAssetGen(props.project, typeRef)
const activeGen = computed(() => props.gen ?? internalGen.value)

const modalRef = ref<InstanceType<typeof UIModal> | null>(null)

async function handleGenCollapse() {
  const gen = activeGen.value
  if (gen == null) throw new Error('sprite gen expected')
  if (props.gen == null) {
    keepAlive(gen)
  }
  const transformOrigin = await props.genCollapseHandler(gen, props.gen == null)
  if (modalRef.value != null && transformOrigin != null) {
    modalRef.value.setTransformOrigin(transformOrigin)
  }
  emit('cancelled')
}

const handleModalClose = useMessageHandle(
  async () => {
    // If the gen is provided by props, it means the modal is controlled by an external gen,
    // and closing the modal will not cancel the gen. So we only show confirmation when there
    // is no external gen, which means closing the modal will cancel the gen and lose progress.
    if (props.gen == null) {
      await confirm({
        title: i18n.t({ zh: '退出精灵生成？', en: 'Exit sprite generation?' }),
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
</script>

<template>
  <UIModal
    ref="modalRef"
    :radar="{ name: 'Sprite generation modal', desc: 'Modal for sprite generation' }"
    style="width: 1076px; height: 800px"
    :visible="visible"
    mask-closable
    @update:visible="handleModalClose"
  >
    <header class="flex h-14 items-center justify-between border-b border-grey-400 px-6">
      <h2 class="text-16 text-title">{{ $t({ zh: '生成精灵', en: 'Sprite Generator' }) }}</h2>
      <UIModalClose class="close" @click="handleModalClose" />
    </header>

    <SpriteGenComp
      v-if="activeGen != null"
      class="min-h-0 flex-[1_1_0]"
      :gen="activeGen"
      library-search-enabled
      @collapse="handleGenCollapse"
      @resolved="emit('resolved', $event)"
    />
  </UIModal>
</template>
