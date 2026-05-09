<script setup lang="ts">
import { ref } from 'vue'
import { UIModal, UIModalClose, useConfirmDialog } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useWatchResult } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import type { Sprite } from '@/models/spx/sprite'
import { SpriteGen as SpriteGenModel } from '@/models/spx/gen/sprite-gen'
import type { SpxProject } from '@/models/spx/project'
import { initSpriteGen, type GenHelpers } from '../modal'
import SpriteGenComp from './SpriteGen.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    project: SpxProject
    gen?: SpriteGenModel
    helpers: GenHelpers
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

const gen = useWatchResult(
  () => [props.gen, props.project, props.helpers] as const,
  ([gen, project, helpers], onCleanup) => {
    if (gen != null) return gen
    return initSpriteGen(i18n, project, helpers, onCleanup)
  }
)

const modalRef = ref<InstanceType<typeof UIModal> | null>(null)

async function collapseGen() {
  const transformOrigin = await props.helpers.getPos(gen.value)
  if (modalRef.value != null && transformOrigin != null) {
    modalRef.value.setTransformOrigin(transformOrigin)
  }
  emit('cancelled')
}

const handleModalClose = useMessageHandle(
  async () => {
    if (!props.helpers.isPersisted(gen.value)) {
      // If the gen is not persisted, closing the modal means dropping the current gen,
      // which may cause data loss, so we should confirm with the user.
      await confirm({
        title: i18n.t({ zh: '退出精灵生成？', en: 'Exit sprite generation?' }),
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
    <header class="h-14 flex items-center justify-between border-b border-grey-400 px-6">
      <h2 class="text-xl text-title">{{ $t({ zh: '生成精灵', en: 'Sprite Generator' }) }}</h2>
      <UIModalClose class="close" @click="handleModalClose" />
    </header>

    <SpriteGenComp
      v-if="gen != null"
      class="flex-[1_1_0] min-h-0"
      :gen="gen"
      library-search-enabled
      @collapse="collapseGen"
      @resolved="emit('resolved', $event)"
    />
  </UIModal>
</template>
