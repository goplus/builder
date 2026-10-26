<script setup lang="ts">
import { computed, shallowRef, watch, onBeforeUnmount } from 'vue'
import type { Sprite } from '@/models/spx/sprite'
import type { SpriteEdit } from '@/models/spx/edit/sprite-edit'
import type { SpriteContentSelected } from '@/models/spx/common/sprite-content'
import { useMessageHandle } from '@/utils/exception'
import { useApplySpriteEdit, useRenameCostumeGen, useRenameAnimationGen } from '@/components/asset'
import { UIMenu, UIMenuItem, UIEmpty } from '@/components/ui'
import CostumeGenItem from '@/components/asset/gen/costume/CostumeGenItem.vue'
import AnimationGenItem from '@/components/asset/gen/animation/AnimationGenItem.vue'
import SpriteContentEditor from '@/components/asset/sprite/SpriteContentEditor.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import EditorList from '../common/EditorList.vue'

const props = defineProps<{ sprite: Sprite; type: 'costume' | 'animation' }>()
const editorCtx = useEditorCtx()
const commenting = computed({
  get: () => editorCtx.state.spriteState?.aiCommenting ?? false,
  set: (commenting: boolean) => {
    if (editorCtx.state.spriteState != null) editorCtx.state.spriteState.aiCommenting = commenting
  }
})
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

function add() {
  if (edit.value == null) return
  const item = props.type === 'costume' ? edit.value.addCostume() : edit.value.addAnimation()
  edit.value.setSelectedItem({ type: props.type, id: item.id })
}
onBeforeUnmount(() => {
  if (edit.value != null) editorCtx.state.spriteEditState.finish(edit.value)
})
const apply = useApplySpriteEdit()
async function applyResource(item: SpriteContentSelected) {
  if (edit.value == null) return
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
    <template v-if="type === 'costume'">
      <CostumeGenItem
        v-for="gen in edit.costumes"
        :key="gen.id"
        :gen="gen"
        :active="edit.selectedItem?.id === gen.id"
        :is-default="gen.id === edit.defaultCostume?.id"
        :operable="edit.isNewResource({ type, id: gen.id }) ? { removable: true } : false"
        @click="edit.setSelectedItem({ type, id: gen.id })"
        @rename="renameCostume(gen)"
        @remove="edit.removeCostume(gen.id)"
      />
    </template>
    <template v-else>
      <AnimationGenItem
        v-for="gen in edit.animations"
        :key="gen.id"
        :gen="gen"
        :active="edit.selectedItem?.id === gen.id"
        :operable="edit.isNewResource({ type, id: gen.id })"
        @click="edit.setSelectedItem({ type, id: gen.id })"
        @rename="renameAnimation(gen)"
        @remove="edit.removeAnimation(gen.id)"
      />
    </template>
    <template #add-options>
      <UIMenu
        ><UIMenuItem v-radar="{ name: 'Generate resource', desc: 'Generate a new resource with AI' }" @click="add">
          {{ $t({ en: 'Generate with AI', zh: '使用 AI 生成' }) }}
        </UIMenuItem></UIMenu
      >
    </template>
    <template #detail>
      <SpriteContentEditor
        v-if="edit.selectedItem?.type === type"
        :key="edit.id"
        v-model:commenting="commenting"
        :content="edit"
        :apply-resource="applyResource"
        embedded
      />
      <UIEmpty v-else size="large">{{ $t({ en: 'Click + to add an animation', zh: '点击 + 添加动画' }) }}</UIEmpty>
    </template>
  </EditorList>
</template>
