<script setup lang="ts">
import { computed } from 'vue'
import { UIModal, UIModalClose, useConfirmDialog } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { AssetType } from '@/apis/asset'
import type { Backdrop } from '@/models/spx/backdrop'
import type { BackdropGen as BackdropGenModel } from '@/models/spx/gen/backdrop-gen'
import type { SpxProject } from '@/models/spx/project'
import { useAssetGen } from '../use-asset-gen'
import BackdropGenComp from './BackdropGen.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    project: SpxProject
    // Currently no use case for providing an external gen, but we keep this prop
    // for consistency with SpriteGenModal and potential future use cases.
    gen?: BackdropGenModel
  }>(),
  {
    gen: undefined
  }
)

const emit = defineEmits<{
  resolved: [Backdrop]
  cancelled: []
}>()

const i18n = useI18n()
const confirm = useConfirmDialog()

const typeRef = computed(() => (props.gen != null ? null : AssetType.Backdrop))
const { assetGen: internalGen } = useAssetGen(props.project, typeRef)
const activeGen = computed(() => props.gen ?? internalGen.value)

const handleModalClose = useMessageHandle(
  async () => {
    if (props.gen == null) {
      await confirm({
        title: i18n.t({ zh: '退出背景生成？', en: 'Exit backdrop generation?' }),
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
    :radar="{ name: 'Backdrop generation modal', desc: 'Modal for backdrop generation' }"
    style="width: 1076px; height: 800px"
    :visible="visible"
    mask-closable
    @update:visible="handleModalClose"
  >
    <header class="header">
      <h2 class="title">{{ $t({ zh: '生成背景', en: 'Backdrop Generator' }) }}</h2>
      <UIModalClose class="close" @click="handleModalClose" />
    </header>

    <BackdropGenComp
      v-if="activeGen != null"
      class="backdrop-gen"
      :gen="activeGen"
      library-search-enabled
      @resolved="emit('resolved', $event)"
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

.backdrop-gen {
  flex: 1 1 0;
  min-height: 0;
}
</style>
