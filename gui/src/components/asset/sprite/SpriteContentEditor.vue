<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { computedShallowReactive, useComputedDisposable } from '@/utils/utils'
import { useNetwork } from '@/utils/network'
import { useSignedIn } from '@/stores/user'
import type { Animation } from '@/models/spx/animation'
import type { Costume } from '@/models/spx/costume'
import type { SpriteContent, SpriteContentSelected } from '@/models/spx/common/sprite-content'
import type { CostumeGen } from '@/models/spx/gen/costume-gen'
import type { AnimationGen } from '@/models/spx/gen/animation-gen'
import { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import { cloudHelpers } from '@/models/common/cloud'
import { UIButton, UIIcon, UITooltip, useConfirmDialog, useMessage } from '@/components/ui'
import { provideLocalEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { EditorState } from '@/components/editor/editor-state'
import type { ILocalCache } from '@/components/editor/editing'
import { useRenameAnimationGen, useRenameCostumeGen } from '..'
import ListItemWrapper from '../gen/common/ListItemWrapper.vue'
import CostumeGenItem from '../gen/costume/CostumeGenItem.vue'
import AnimationGenItem from '../gen/animation/AnimationGenItem.vue'
import CostumeGenPreview from '../gen/costume/CostumeGenPreview.vue'
import AnimationGenPreview from '../gen/animation/AnimationGenPreview.vue'
import CostumeComments from './CostumeComments.vue'
import SpriteResourceInput from './SpriteResourceInput.vue'
import AnimationDetail from '@/components/editor/sprite/AnimationDetail.vue'
import CostumeDetail from '@/components/editor/sprite/CostumeDetail.vue'
import ResourceEditActions from '@/components/editor/sprite/ResourceEditActions.vue'
import ResourceWorkspace from '@/components/editor/sprite/ResourceWorkspace.vue'

const props = defineProps<{
  content: SpriteContent
  embedded?: boolean
  savedAnimation?: Animation | null
  savedCostume?: Costume | null
  applyResource?: (item: SpriteContentSelected) => Promise<void>
}>()

const emit = defineEmits<{
  collapse: []
}>()
const commenting = defineModel<boolean>('commenting', { default: false })
const activeTool = ref<string | null>('ai')
const comments = ref<InstanceType<typeof CostumeComments> | null>(null)
const workspace = ref<InstanceType<typeof ResourceWorkspace> | null>(null)

function openAIEditor() {
  workspace.value?.openAIEditor()
}
defineExpose({ openAIEditor })
watch([commenting, workspace], ([active]) => {
  if (props.embedded && active) openAIEditor()
})

const selected = computed(() => {
  const selectedItem = props.content.selectedItem
  if (selectedItem == null) return null
  const { type, id } = selectedItem
  switch (type) {
    case 'costume':
      return { type: 'costume', costume: props.content.getCostumeById(id) }
    case 'animation':
      return { type: 'animation', animation: props.content.getAnimationById(id) }
    default:
      return null
  }
})

function select(type: 'costume' | 'animation', id: string) {
  props.content.setSelectedItem({ type, id })
}

watch(
  selected,
  (selected) => {
    if (props.embedded) return
    // Select the first item of current type if no item is selected
    if (selected?.animation != null || selected?.costume != null) return
    if (selected?.type === 'animation' && props.content.animations.length > 0) {
      select('animation', props.content.animations[0].id)
    } else if (props.content.costumes.length > 0) {
      select('costume', props.content.costumes[0].id)
    }
  },
  { immediate: true }
)

const selectedCostume = computed(() => selected.value?.costume ?? null)
const selectedAnimation = computed(() => selected.value?.animation ?? null)
watch(
  [selectedCostume, () => selectedCostume.value?.image, () => selectedCostume.value?.editComments.length],
  () => (commenting.value = (selectedCostume.value?.editComments.length ?? 0) > 0),
  { immediate: true }
)

const aiEnabled = computed(() => {
  if (selectedCostume.value != null) return true
  const gen = selectedAnimation.value
  if (gen == null) return false
  return props.content instanceof SpriteEdit
    ? props.content.isNewResource({ type: 'animation', id: gen.id })
    : gen.result == null
})
const selectedGen = computed(() => selectedCostume.value ?? selectedAnimation.value)
const selectedPreview = computed(() => {
  const costume = selectedCostume.value
  if (costume != null) {
    if (props.embedded && activeTool.value !== 'ai' && props.savedCostume != null) {
      return { component: CostumeDetail, props: { costume: props.savedCostume } }
    }
    return {
      component: CostumeGenPreview,
      props: {
        gen: costume,
        resourceActions: !props.embedded,
        pendingMessage: costume.result != null ? { en: 'Editing costume...', zh: '正在修改造型...' } : undefined
      }
    }
  }
  const animation = selectedAnimation.value
  if (animation != null) {
    if (props.embedded && (!aiEnabled.value || activeTool.value !== 'ai') && props.savedAnimation != null) {
      return { component: AnimationDetail, props: { animation: props.savedAnimation, settingsEditable: false } }
    }
    return {
      component: AnimationGenPreview,
      props: {
        gen: animation,
        savedAnimation:
          props.content instanceof SpriteEdit &&
          props.content.hasResourceChanges({ type: 'animation', id: animation.id })
            ? null
            : props.savedAnimation,
        resourceActions: !props.embedded,
        settingsEditable: !props.embedded
      }
    }
  }
  return null
})
const canDiscard = computed(() => {
  const gen = selectedGen.value
  return gen != null && (props.content.editHistory.canUndo(gen.id) || props.content.editHistory.canRedo(gen.id))
})
const hasDraft = computed(() => {
  const item = props.content.selectedItem
  if (item == null) return false
  const instruction = item.type === 'costume' ? props.content.getCostumeInstruction(item.id) : ''
  return (
    canDiscard.value ||
    instruction.trim() !== '' ||
    (selectedCostume.value?.editComments.length ?? 0) > 0 ||
    (props.content instanceof SpriteEdit &&
      props.content.hasResourceChanges(item) &&
      (selectedCostume.value?.image != null ||
        selectedAnimation.value?.video != null ||
        selectedAnimation.value?.result != null))
  )
})
const selectedBusy = computed(() => {
  const gen = selectedGen.value
  const status = selectedCostume.value?.generateState.status ?? selectedAnimation.value?.generateVideoState.status
  return status === 'running' || gen?.finishState.status === 'running' || handleApply.isLoading.value
})
const canReview = computed(() => {
  const item = props.content.selectedItem
  if (item == null) return false
  if (props.content.editHistory.canRedo(item.id)) return true
  if (props.content instanceof SpriteEdit) {
    if (!props.content.hasResourceChanges(item)) return false
    if (!props.content.isNewResource(item) && !props.content.editHistory.canUndo(item.id)) return false
  }
  return (
    selectedCostume.value?.image != null ||
    selectedAnimation.value?.video != null ||
    selectedAnimation.value?.result != null
  )
})
const canApply = computed(() => {
  if (selectedBusy.value || (props.embedded && !canReview.value)) return false
  if (
    props.content instanceof SpriteEdit &&
    props.content.selectedItem != null &&
    !props.content.hasResourceChanges(props.content.selectedItem)
  )
    return false
  const costume = selectedCostume.value
  if (costume != null) return costume.generateState.status !== 'failed' && costume.image != null
  const animation = selectedAnimation.value
  return (
    animation != null &&
    animation.generateVideoState.status !== 'failed' &&
    (animation.hasPendingVideo ? animation.framesConfig != null : animation.result != null)
  )
})
function isNewResource(type: 'costume' | 'animation', id: string) {
  return props.content instanceof SpriteEdit && props.content.isNewResource({ type, id })
}
const message = useMessage()
const handleApply = useMessageHandle(
  async () => {
    const item = props.content.selectedItem
    const gen = selectedGen.value
    if (item == null || gen == null) return
    if (selectedCostume.value != null && selectedCostume.value.image !== selectedCostume.value.result?.img) {
      await selectedCostume.value.finish()
    } else if (selectedAnimation.value?.hasPendingVideo) {
      await selectedAnimation.value.finish()
    }
    await nextTick()
    if (props.applyResource != null) {
      await props.applyResource(item)
    } else {
      selectedCostume.value?.acceptEdit()
      props.content.editHistory.clear(item.id)
      if (item.type === 'costume') props.content.setCostumeInstruction(item.id, '')
    }
    if (props.embedded && props.content.selectedItem?.id === item.id) activeTool.value = null
    message.success(
      i18n.t(
        item.type === 'costume'
          ? { en: 'Costume applied', zh: '造型已采用' }
          : { en: 'Animation applied', zh: '动画已采用' }
      )
    )
  },
  { en: 'Failed to apply changes', zh: '采用修改失败' }
)

const handleUndo = useMessageHandle(() => {
  if (selectedGen.value != null) props.content.editHistory.undo(selectedGen.value)
}).fn
const handleRedo = useMessageHandle(() => {
  if (selectedGen.value != null) props.content.editHistory.redo(selectedGen.value)
}).fn
const handleDiscard = useMessageHandle(
  async () => {
    const item = props.content.selectedItem
    const gen = selectedGen.value
    if (item == null || gen == null) return
    if (props.embedded && !hasDraft.value) return
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Discard changes?', zh: '放弃修改？' }),
      content: i18n.t({
        en: `Restore "${gen.name}" to how it was before editing. You won't be able to redo these changes.`,
        zh: `将“${gen.name}”恢复到本轮修改前，本轮修改将无法重做。`
      }),
      cancelText: i18n.t({ en: 'Cancel', zh: '取消' }),
      confirmText: i18n.t({ en: 'Discard changes', zh: '放弃修改' })
    })
    props.content.editHistory.discard(gen)
    if (item.type === 'costume') props.content.getCostumeById(item.id)?.setEditComments([])
    if (item.type === 'costume') props.content.setCostumeInstruction(item.id, '')
    if (props.embedded && selectedCostume.value?.result != null) activeTool.value = null
  },
  { en: 'Failed to discard changes', zh: '放弃修改失败' }
).fn
const historyButtonClass =
  'h-8 w-8 flex items-center justify-center rounded-md border-none bg-transparent text-grey-900 disabled:cursor-not-allowed disabled:text-grey-600 enabled:cursor-pointer enabled:hover:bg-grey-200 enabled:active:bg-grey-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-main'

const renameCostume = useRenameCostumeGen()
const handleRenameCostume = useMessageHandle(renameCostume, {
  en: 'Failed to rename costume',
  zh: '重命名造型失败'
}).fn

const handleRemoveCostume = useMessageHandle((costumeGen: CostumeGen) => props.content.removeCostume(costumeGen.id), {
  en: 'Failed to remove costume',
  zh: '删除造型失败'
}).fn

function handleAddCostume() {
  const costumeGen = props.content.addCostume()
  select('costume', costumeGen.id)
}

const renameAnimation = useRenameAnimationGen()
const handleRenameAnimation = useMessageHandle(renameAnimation, {
  en: 'Failed to rename animation',
  zh: '重命名动画失败'
}).fn

const handleRemoveAnimation = useMessageHandle(
  (animationGen: AnimationGen) => props.content.removeAnimation(animationGen.id),
  {
    en: 'Failed to remove animation',
    zh: '删除动画失败'
  }
).fn

function handleAddAnimation() {
  const animationGen = props.content.addAnimation()
  select('animation', animationGen.id)
}

const i18n = useI18n()
const confirm = useConfirmDialog()
const signedIn = useSignedIn()
const { isOnline } = useNetwork()
const localCache: ILocalCache = {
  load: () => Promise.reject(new Error('Not implemented')),
  save: () => Promise.reject(new Error('Not implemented')),
  clear: () => Promise.reject(new Error('Not implemented'))
}
// Preview controls must write to the draft's local history, not the source project.
const previewState = useComputedDisposable(
  () => new EditorState(i18n, props.content.previewProject, isOnline, signedIn, cloudHelpers, localCache)
)
provideLocalEditorCtx(
  computedShallowReactive(() => ({ project: props.content.previewProject, state: previewState.value }))
)
</script>

<template>
  <main
    v-radar="{ name: 'Sprite content editor', desc: 'Edit sprite costumes and animations' }"
    class="h-full min-h-0 min-w-0 flex-1 flex flex-col"
    :class="{ 'bg-grey-200': embedded }"
  >
    <div class="flex-1 min-h-0 flex">
      <aside v-if="!embedded" class="w-102 flex-none min-h-0 border-e border-grey-400 bg-grey-100 pt-4 flex flex-col">
        <div class="min-h-0 flex-[1_1_0] overflow-y-auto px-4 flex flex-col gap-6">
          <ListItemWrapper v-radar="{ name: 'costume-list', desc: 'List of costumes' }" @add="handleAddCostume">
            <template #title>{{ $t({ zh: '造型', en: 'Costume' }) }}</template>
            <CostumeGenItem
              v-for="c in content.costumes"
              :key="c.id"
              :active="selectedCostume?.id === c.id"
              :gen="c"
              :costume="c.result ?? null"
              :is-default="c.id === content.defaultCostume?.id"
              :operable="isNewResource('costume', c.id) ? { removable: c.id !== content.defaultCostume?.id } : false"
              @click="select('costume', c.id)"
              @rename="handleRenameCostume(c)"
              @remove="handleRemoveCostume(c)"
            />
          </ListItemWrapper>

          <ListItemWrapper v-radar="{ name: 'animation-list', desc: 'List of animations' }" @add="handleAddAnimation">
            <template #title>{{ $t({ zh: '动画', en: 'Animation' }) }}</template>
            <AnimationGenItem
              v-for="a in content.animations"
              :key="a.id"
              :active="selectedAnimation?.id === a.id"
              :gen="a"
              :animation="a.result ?? null"
              :operable="isNewResource('animation', a.id)"
              @click="select('animation', a.id)"
              @rename="handleRenameAnimation(a)"
              @remove="handleRemoveAnimation(a)"
            />
          </ListItemWrapper>
        </div>
        <div class="flex-none px-4 py-5">
          <SpriteResourceInput
            v-model:commenting="commenting"
            :content="content"
            :costume="selectedCostume"
            :animation="selectedAnimation"
            @select-comment="comments?.open($event)"
          />
        </div>
      </aside>
      <ResourceWorkspace
        ref="workspace"
        v-model:active-tool="activeTool"
        :can-review="canReview"
        :busy="selectedBusy"
        :selection-locked="canDiscard || canReview"
        :ai-enabled="aiEnabled"
        :enabled="embedded"
        :resource-key="selectedGen?.id"
        :resource-type="content.selectedItem?.type"
        :pending="selectedCostume != null ? selectedCostume.result == null : true"
      >
        <slot v-if="embedded" name="settings"></slot>
        <component :is="selectedPreview.component" v-if="selectedPreview != null" v-bind="selectedPreview.props">
          <template v-if="!embedded" #leading>
            <div
              v-if="selectedGen != null"
              v-radar="{ name: 'Resource edit history', desc: 'Undo or redo changes to the current resource' }"
              role="group"
              class="flex items-center gap-1"
            >
              <UITooltip>
                {{ $t({ en: 'Undo', zh: '撤销' }) }}
                <template #trigger>
                  <button
                    v-radar="{ name: 'Undo edit', desc: 'Return to the previous draft of this resource' }"
                    type="button"
                    :class="historyButtonClass"
                    :disabled="selectedBusy || !content.editHistory.canUndo(selectedGen.id)"
                    @click="handleUndo"
                  >
                    <UIIcon type="undo" class="h-5 w-5" />
                  </button>
                </template>
              </UITooltip>
              <UITooltip>
                {{ $t({ en: 'Redo', zh: '重做' }) }}
                <template #trigger>
                  <button
                    v-radar="{ name: 'Redo edit', desc: 'Restore the next draft of this resource' }"
                    type="button"
                    :class="historyButtonClass"
                    :disabled="selectedBusy || !content.editHistory.canRedo(selectedGen.id)"
                    @click="handleRedo"
                  >
                    <UIIcon type="redo" class="h-5 w-5" />
                  </button>
                </template>
              </UITooltip>
            </div>
          </template>
          <template
            v-if="commenting && selectedCostume != null && !selectedBusy && (!embedded || activeTool === 'ai')"
            #overlay="{ area }"
          >
            <CostumeComments ref="comments" :key="selectedCostume.id" :gen="selectedCostume" :canvas-area="area" />
          </template>
          <template #ops>
            <template v-if="!embedded">
              <div class="flex items-center gap-2">
                <UIButton
                  v-if="canDiscard"
                  v-radar="{
                    name: 'Discard changes',
                    desc: 'Discard unapplied changes to the selected costume or animation'
                  }"
                  type="white"
                  :disabled="selectedBusy || !hasDraft"
                  @click="handleDiscard"
                >
                  {{ $t({ en: 'Discard', zh: '放弃' }) }}
                </UIButton>
                <UIButton
                  v-radar="{
                    name: 'Save resource',
                    desc: 'Save only this costume or animation and clear its draft history'
                  }"
                  type="green"
                  :disabled="!canApply"
                  :loading="handleApply.isLoading.value"
                  @click="handleApply.fn"
                >
                  {{ $t({ en: 'Save', zh: '保存' }) }}
                </UIButton>
              </div>
            </template>
          </template>
        </component>
        <template v-if="embedded" #prompt>
          <SpriteResourceInput
            v-model:commenting="commenting"
            :content="content"
            :costume="selectedCostume"
            :animation="selectedAnimation"
            compact
            @select-comment="comments?.open($event)"
          />
        </template>
        <template v-if="embedded" #actions="{ section }">
          <ResourceEditActions
            :section="section"
            :busy="selectedBusy"
            :can-undo="selectedGen != null && content.editHistory.canUndo(selectedGen.id)"
            :can-redo="selectedGen != null && content.editHistory.canRedo(selectedGen.id)"
            :can-save="canApply"
            :saving="handleApply.isLoading.value"
            @undo="handleUndo"
            @redo="handleRedo"
            @discard="handleDiscard"
            @save="handleApply.fn"
          />
        </template>
      </ResourceWorkspace>
    </div>
    <footer v-if="!embedded" class="flex-none px-6 py-5 flex flex-wrap items-center justify-end gap-4">
      <UITooltip>
        {{
          $t({
            zh: '收起弹窗，任务将在后台继续进行，可随时查看',
            en: 'Minimize the popup, the task will continue in the background and can be viewed at any time'
          })
        }}
        <template #trigger>
          <UIButton
            v-radar="{
              name: 'minimize',
              desc: 'Click to minimize the sprite generation modal'
            }"
            type="secondary"
            size="large"
            @click="emit('collapse')"
          >
            {{ $t({ en: 'Minimize', zh: '收起' }) }}
          </UIButton>
        </template>
      </UITooltip>
    </footer>
  </main>
</template>
