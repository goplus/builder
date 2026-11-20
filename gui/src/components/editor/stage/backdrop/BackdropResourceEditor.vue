<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import type { Backdrop } from '@/models/spx/backdrop'
import type { CostumeEditComment } from '@/models/spx/gen/costume-gen'
import { useRenameBackdrop } from '@/components/asset'
import { useConfirmDialog, useMessage } from '@/components/ui'
import CostumeEditInput from '@/components/asset/sprite/CostumeEditInput.vue'
import CostumeComments from '@/components/asset/sprite/CostumeComments.vue'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import ResourceWorkspace from '../../sprite/ResourceWorkspace.vue'
import ResourceEditActions from '../../sprite/ResourceEditActions.vue'
import { provideResourceCanvas } from '../../sprite/resource-canvas'
import BackdropEditPreview from './BackdropEditPreview.vue'

const props = defineProps<{ backdrop: Backdrop }>()
const { state } = useEditorCtx()
const edit = computed(() => state.backdropEditState.start(props.backdrop))
const activeTool = ref<string | null>('ai')
const commenting = ref(false)
const comments = ref<InstanceType<typeof CostumeComments> | null>(null)
const { t } = useI18n()
const message = useMessage()
const confirm = useConfirmDialog()
provideResourceCanvas()

const canReview = computed(() => edit.value.canUndo || edit.value.canRedo)
const busy = computed(() => edit.value.generateState.status === 'running' || save.isLoading.value)
const versionLabel = computed(() =>
  edit.value.version === 0
    ? t({ en: 'Original', zh: '原版' })
    : t({ en: `Version ${edit.value.version}`, zh: `第 ${edit.value.version} 版` })
)
const rename = useRenameBackdrop()
const handleRename = useMessageHandle(() => rename(props.backdrop), {
  en: 'Failed to rename backdrop',
  zh: '重命名背景失败'
}).fn

const save = useMessageHandle(
  async () => {
    const draft = edit.value
    await state.history.doAction(
      { name: { en: `Edit backdrop ${props.backdrop.name}`, zh: `修改背景 ${props.backdrop.name}` } },
      () => draft.applyToBackdrop(props.backdrop)
    )
    draft.accept()
    commenting.value = false
    activeTool.value = null
    message.success(t({ en: 'Backdrop applied', zh: '背景已采用' }))
  },
  { en: 'Failed to apply changes', zh: '采用修改失败' }
)

const discard = useMessageHandle(
  async () => {
    await confirm({
      type: 'warning',
      title: t({ en: 'Discard changes?', zh: '放弃修改？' }),
      content: t({
        en: `Restore "${props.backdrop.name}" to how it was before editing. You won't be able to redo these changes.`,
        zh: `将“${props.backdrop.name}”恢复到本轮修改前，本轮修改将无法重做。`
      }),
      cancelText: t({ en: 'Cancel', zh: '取消' }),
      confirmText: t({ en: 'Discard changes', zh: '放弃修改' })
    })
    edit.value.discard()
    commenting.value = false
    activeTool.value = null
  },
  { en: 'Failed to discard changes', zh: '放弃修改失败' }
).fn

async function selectComment(comment: CostumeEditComment) {
  commenting.value = true
  await nextTick()
  comments.value?.open(comment)
}
</script>

<template>
  <ResourceWorkspace
    v-model:active-tool="activeTool"
    :resource-key="backdrop.id"
    resource-type="backdrop"
    :can-review="canReview"
    :busy="busy"
    :selection-locked="commenting || edit.editComments.length > 0 || canReview"
  >
    <BackdropEditPreview :backdrop="backdrop" :edit="edit" @rename="handleRename">
      <template v-if="commenting && !busy && activeTool === 'ai'" #overlay="{ area }">
        <CostumeComments ref="comments" :gen="edit" :canvas-area="area" />
      </template>
    </BackdropEditPreview>
    <template #prompt>
      <CostumeEditInput
        v-model:instruction="edit.instruction"
        v-model:commenting="commenting"
        :gen="edit"
        resource-type="backdrop"
        compact
        @select-comment="selectComment"
      />
    </template>
    <template #actions="{ section }">
      <ResourceEditActions
        :section="section"
        :version-label="versionLabel"
        :can-undo="edit.canUndo"
        :can-redo="edit.canRedo"
        :can-save="edit.hasChanges && edit.generateState.status !== 'failed'"
        :busy="busy"
        :saving="save.isLoading.value"
        @undo="edit.undo()"
        @redo="edit.redo()"
        @discard="discard"
        @save="save.fn"
      />
    </template>
  </ResourceWorkspace>
</template>
