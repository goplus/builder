<script setup lang="ts">
import { computed, shallowRef, watch, onBeforeUnmount } from 'vue'
import { Animation } from '@/models/spx/animation'
import { Costume } from '@/models/spx/costume'
import type { Sprite } from '@/models/spx/sprite'
import type { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import type { SpriteContentSelected } from '@/models/spx/common/sprite-content'
import { useMessageHandle } from '@/utils/exception'
import {
  useApplySpriteEdit,
  useRenameCostumeGen,
  useRenameAnimationGen,
  useAddCostumeFromLocalFile,
  useAddAnimationByGroupingCostumes
} from '@/components/asset'
import { UIEmpty, UIMenu, UIMenuItem } from '@/components/ui'
import CostumeGenItem, { isCostumeLoading } from '@/components/asset/gen/costume/CostumeGenItem.vue'
import AnimationGenItem, { isAnimationLoading } from '@/components/asset/gen/animation/AnimationGenItem.vue'
import GenerationIndicator from '@/components/asset/gen/common/GenerationIndicator.vue'
import SpriteContentEditor from '@/components/asset/sprite/SpriteContentEditor.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import SpriteResourceSettings from './SpriteResourceSettings.vue'
import EditorList from '../common/EditorList.vue'
import CostumeItem from './CostumeItem.vue'
import AnimationItem from './AnimationItem.vue'

const props = defineProps<{ sprite: Sprite; type: 'costume' | 'animation' }>()
const commenting = defineModel<boolean>('commenting', { default: false })
const editorCtx = useEditorCtx()
const edit = shallowRef<SpriteEdit | null>(null)
watch(
  () => [props.sprite, props.type] as const,
  ([sprite, type]) => {
    edit.value =
      editorCtx.state.spriteEditState.edits.find((edit) => edit.sourceSpriteId === sprite.id) ??
      editorCtx.state.spriteEditState.start(sprite)
    if (edit.value.selectedItem?.type === type) return
    const items = type === 'costume' ? edit.value.costumes : edit.value.animations
    const resource = type === 'costume' ? editorCtx.state.selectedCostume : editorCtx.state.selectedAnimation
    const item = items.find((gen) => gen.result?.id === resource?.id) ?? items[0]
    edit.value.setSelectedItem(item == null ? null : { type, id: item.id })
  },
  { immediate: true }
)

watch(
  () => edit.value?.selectedItem,
  (item) => {
    if (edit.value == null) return
    if (item == null || item.type !== props.type) {
      const first = props.type === 'costume' ? edit.value.costumes[0] : edit.value.animations[0]
      if (first != null) edit.value.setSelectedItem({ type: props.type, id: first.id })
      return
    }
    const result =
      item.type === 'costume'
        ? edit.value.getCostumeById(item.id)?.result
        : edit.value.getAnimationById(item.id)?.result
    if (result == null || edit.value.isNewResource(item)) return
    if (item.type === 'costume') editorCtx.state.spriteState?.selectCostume(result.id)
    else editorCtx.state.spriteState?.selectAnimation(result.id)
  },
  { immediate: true }
)

watch(
  () => [
    props.sprite.costumes.map(({ id, name }) => ({ id, name })),
    props.sprite.animations.map(({ id, name }) => ({ id, name })),
    props.sprite.defaultCostume?.id
  ],
  () => edit.value?.syncResources(props.sprite)
)
watch(
  () => (props.type === 'costume' ? editorCtx.state.selectedCostume : editorCtx.state.selectedAnimation),
  (resource) => {
    if (resource != null) selectResource(resource.id)
  }
)

function selectResource(id: string) {
  const items = props.type === 'costume' ? edit.value?.costumes : edit.value?.animations
  const gen = items?.find((gen) => gen.result?.id === id)
  if (gen != null) edit.value?.setSelectedItem({ type: props.type, id: gen.id })
}
const costumeItems = computed(() =>
  props.sprite.costumes.map((costume) => ({
    costume,
    gen: edit.value?.costumes.find((gen) => gen.result?.id === costume.id)
  }))
)
const animationItems = computed(() =>
  props.sprite.animations.map((animation) => ({
    animation,
    gen: edit.value?.animations.find((gen) => gen.result?.id === animation.id)
  }))
)

const groups = computed(() => {
  const items = props.type === 'costume' ? edit.value?.costumes : edit.value?.animations
  const groups: string[] = []
  if (items?.some((gen) => !isDraft(gen.id))) groups.push('default')
  if (items?.some((gen) => isDraft(gen.id))) groups.push('drafts')
  return groups
})
function isDraft(id: string) {
  return edit.value?.isNewResource({ type: props.type, id }) ?? false
}

function add() {
  if (edit.value == null) return
  const item = props.type === 'costume' ? edit.value.addCostume() : edit.value.addAnimation()
  edit.value.setSelectedItem({ type: props.type, id: item.id })
}
onBeforeUnmount(() => {
  if (edit.value != null) editorCtx.state.spriteEditState.finish(edit.value)
})
const savedResource = computed(() => {
  const item = edit.value?.selectedItem
  if (item == null) return null
  const gen = item.type === 'costume' ? edit.value?.getCostumeById(item.id) : edit.value?.getAnimationById(item.id)
  const resources = item.type === 'costume' ? props.sprite.costumes : props.sprite.animations
  return resources.find((resource) => resource.id === gen?.result?.id) ?? null
})
const addFromLocalFile = useAddCostumeFromLocalFile()
const groupCostumes = useAddAnimationByGroupingCostumes()
const handleImport = useMessageHandle(async () => {
  const currentEdit = edit.value
  if (currentEdit == null) return
  const type = props.type
  const sprite = props.sprite
  const resource =
    type === 'costume' ? (await addFromLocalFile(sprite))[0] : await groupCostumes(editorCtx.project, sprite)
  if (resource == null) return
  currentEdit.syncResources(sprite)
  const items = type === 'costume' ? currentEdit.costumes : currentEdit.animations
  const imported = items.find((gen) => gen.result?.id === resource.id)
  if (imported != null) currentEdit.setSelectedItem({ type, id: imported.id })
})
const apply = useApplySpriteEdit()
async function applyResource(item: SpriteContentSelected) {
  if (edit.value == null) return
  const original = savedResource.value
  const draft = item.type === 'animation' ? edit.value.getAnimationById(item.id)?.result : null
  if (original instanceof Animation && draft != null) {
    draft.setSound(original.sound)
    draft.setSoundPlayback(original.soundPlayback)
    edit.value.previewSprite.setAnimationBoundStates(draft.id, props.sprite.getAnimationBoundStates(original.id))
  }
  await apply(edit.value, props.sprite, item)
  const resource =
    item.type === 'costume' ? edit.value.getCostumeById(item.id)?.result : edit.value.getAnimationById(item.id)?.result
  if (resource == null) return
  if (item.type === 'costume') editorCtx.state.spriteState?.selectCostume(resource.id)
  else editorCtx.state.spriteState?.selectAnimation(resource.id)
  if (!edit.value.hasPendingChanges) editorCtx.state.spriteState?.closeAIEditor()
}
const renameCostume = useMessageHandle(useRenameCostumeGen()).fn
const renameAnimation = useMessageHandle(useRenameAnimationGen()).fn
</script>

<template>
  <EditorList v-if="edit != null" class="min-h-0 overflow-hidden" :resource-type="type">
    <template v-if="groups.includes('default')" #default>
      <template v-if="type === 'costume'">
        <CostumeItem
          v-for="item in costumeItems"
          :key="item.costume.id"
          :costume="item.costume"
          :selectable="{ selected: edit.selectedItem?.id === item.gen?.id }"
          operable
          @click="selectResource(item.costume.id)"
        >
          <GenerationIndicator v-if="item.gen != null && isCostumeLoading(item.gen)" />
        </CostumeItem>
      </template>
      <template v-else>
        <AnimationItem
          v-for="item in animationItems"
          :key="item.animation.id"
          :animation="item.animation"
          :selectable="{ selected: edit.selectedItem?.id === item.gen?.id }"
          operable
          @click="selectResource(item.animation.id)"
        >
          <GenerationIndicator v-if="item.gen != null && isAnimationLoading(item.gen)" />
        </AnimationItem>
      </template>
    </template>
    <template v-if="groups.includes('drafts')" #drafts>
      <template v-if="type === 'costume'">
        <CostumeGenItem
          v-for="gen in edit.costumes.filter((gen) => isDraft(gen.id))"
          :key="gen.id"
          :gen="gen"
          :suggested="edit.isSuggestedResource(gen.id)"
          :costume="null"
          :active="edit.selectedItem?.id === gen.id"
          :is-default="gen.id === edit.defaultCostume?.id"
          :operable="{ removable: true }"
          @click="edit.setSelectedItem({ type, id: gen.id })"
          @rename="renameCostume(gen)"
          @remove="edit.removeCostume(gen.id)"
        />
      </template>
      <template v-else>
        <AnimationGenItem
          v-for="gen in edit.animations.filter((gen) => isDraft(gen.id))"
          :key="gen.id"
          :gen="gen"
          :suggested="edit.isSuggestedResource(gen.id)"
          :animation="null"
          :active="edit.selectedItem?.id === gen.id"
          operable
          @click="edit.setSelectedItem({ type, id: gen.id })"
          @rename="renameAnimation(gen)"
          @remove="edit.removeAnimation(gen.id)"
        />
      </template>
    </template>
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{
            name: type === 'costume' ? 'Add from local file' : 'Group costumes',
            desc: 'Add resources to this sprite'
          }"
          @click="handleImport.fn"
        >
          {{
            $t(
              type === 'costume'
                ? { en: 'Select local file', zh: '选择本地文件' }
                : { en: 'Group costumes as animation', zh: '合并造型为动画' }
            )
          }}
        </UIMenuItem>
        <UIMenuItem v-radar="{ name: 'Generate resource', desc: 'Generate a resource with AI' }" @click="add">
          {{ $t({ en: 'Generate with AI', zh: '使用 AI 生成' }) }}
        </UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <SpriteContentEditor
        v-if="edit.selectedItem?.type === type"
        :key="edit.id"
        v-model:commenting="commenting"
        :content="edit"
        :saved-animation="savedResource instanceof Animation ? savedResource : null"
        :saved-costume="savedResource instanceof Costume ? savedResource : null"
        :apply-resource="applyResource"
        embedded
      >
        <template #settings>
          <SpriteResourceSettings
            v-if="savedResource instanceof Animation"
            :animation="savedResource"
            :context="editorCtx"
          />
        </template>
      </SpriteContentEditor>
      <UIEmpty v-else size="large">{{ $t({ en: 'Click + to add an animation', zh: '点击 + 添加动画' }) }}</UIEmpty>
    </template>
  </EditorList>
</template>
