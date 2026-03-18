<script setup lang="ts">
import { computed, ref } from 'vue'
import { UIModal, UIModalClose, useConfirmDialog, type ModalTransformOrigin } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { AssetType } from '@/apis/asset'
import type { SpxProject } from '@/models/spx/project'
import type { AssetGenModel, AssetModel } from '@/models/spx/common/asset'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { useAssetGen, addAssetGenResultToProject } from './useAssetGen'
import AssetGenComp from './AssetGen.vue'

const props = defineProps<{
  visible: boolean
  type: AssetType
  project: SpxProject
  genCollapseHandler: (gen: AssetGenModel) => Promise<ModalTransformOrigin | null>
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [AssetModel]
}>()

const editorCtx = useEditorCtx()
const i18n = useI18n()
const confirm = useConfirmDialog()

const typeRef = computed(() => props.type)
const { assetGen, keepAlive } = useAssetGen(i18n, props.project, typeRef)

const entityMessages = {
  [AssetType.Backdrop]: { en: 'backdrop', zh: '背景' },
  [AssetType.Sprite]: { en: 'sprite', zh: '精灵' },
  [AssetType.Sound]: { en: 'sound', zh: '声音' }
}
const entityMessage = computed(() => entityMessages[props.type])
const title = computed(() => {
  const em = entityMessage.value
  return { en: `Generate ${em.en}`, zh: `生成${em.zh}` }
})

const modalRef = ref<InstanceType<typeof UIModal> | null>(null)

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

const handleGenFinished = useMessageHandle(
  async () => {
    const gen = assetGen.value
    if (gen == null) throw new Error('asset gen expected')
    const added = await editorCtx.state.history.doAction(
      {
        name: { en: `Add ${entityMessage.value.en}`, zh: `添加${entityMessage.value.zh}` }
      },
      () => addAssetGenResultToProject(gen, props.project)
    )
    emit('resolved', added)
  },
  {
    en: 'Failed to generate asset',
    zh: '素材生成失败'
  }
).fn

const handleModalClose = useMessageHandle(
  async () => {
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
  },
  { en: 'Failed to exit modal', zh: '退出失败' }
).fn
</script>

<template>
  <UIModal
    ref="modalRef"
    :radar="{ name: 'Asset generation modal', desc: `Modal for generating ${entityMessage.en}` }"
    style="width: 1076px; height: 800px"
    :visible="visible"
    mask-closable
    @update:visible="handleModalClose"
  >
    <header class="header">
      <h2 class="title">{{ $t(title) }}</h2>
      <UIModalClose class="close" @click="handleModalClose" />
    </header>

    <AssetGenComp
      v-if="assetGen != null"
      class="asset-gen"
      :gen="assetGen"
      @collapse="handleGenCollapse"
      @finished="handleGenFinished"
    />
  </UIModal>
</template>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  border-bottom: 1px solid var(--ui-color-grey-400);

  .title {
    font-size: 16px;
    color: var(--ui-color-title);
  }
}

.asset-gen {
  flex: 1 1 0;
  min-height: 0;
}
</style>
