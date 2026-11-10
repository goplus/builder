<template>
  <EditorList
    v-radar="{ name: 'Animations management', desc: 'Managing animations of current sprite' }"
    resource-type="animation"
    :sortable="{ list: sprite.animations }"
    @sorted="handleSorted"
  >
    <AnimationItem
      v-for="animation in sprite.animations"
      :key="animation.id"
      :sprite="sprite"
      :animation="animation"
      :selectable="{ selected: state.selected?.id === animation.id }"
      operable
      @click="state.select(animation.id)"
    />
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Group costumes', desc: 'Click to group costumes as animation' }"
          @click="handleImport"
        >
          {{ $t({ en: 'Group costumes as animation', zh: '合并造型为动画' }) }}
        </UIMenuItem>
        <UIMenuItem
          v-radar="{ name: 'Generate resource', desc: 'Click to generate an animation with AI' }"
          @click="handleAdd"
        >
          {{ $t({ en: 'Generate with AI', zh: '使用 AI 生成' }) }}
        </UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <ResourceWorkspace
        v-if="state.selected != null"
        :key="state.selected.id"
        :resource-key="state.selected.id"
        resource-type="animation"
        :ai-enabled="false"
      >
        <AnimationDetail :animation="state.selected" @rename="handleRename(state.selected)" />
      </ResourceWorkspace>
      <UIEmpty v-else size="large">{{ $t({ en: 'Click + to add an animation', zh: '点击 + 添加动画' }) }}</UIEmpty>
    </template>
  </EditorList>
</template>

<script lang="ts">
export class AnimationsEditorState extends Disposable {
  constructor(private getSprite: () => Sprite | null) {
    super()
    this.selectedIdRef = ref(getSprite()?.animations[0]?.id ?? null)

    this.addDisposer(
      watch(
        () => this.selected,
        (selected) => {
          if (selected == null && this.animations.length > 0) {
            this.select(this.animations[0].id)
          }
        }
      )
    )
  }

  private selectedIdRef: Ref<string | null>

  private get animations() {
    return this.getSprite()?.animations ?? []
  }

  /** The currently selected animation */
  get selected() {
    return this.animations.find((animation) => animation.id === this.selectedIdRef.value) ?? null
  }
  /** Select a target (by ID) */
  select(id: string | null) {
    this.selectedIdRef.value = id
  }
  /** Select a target (by name) */
  selectByName(name: string): void {
    const animation = this.animations.find((animation) => animation.name === name)
    if (animation == null) {
      capture(new Error(`Animation with name "${name}" not found`))
      return
    }
    this.select(animation.id)
  }
  /** Select a target (by specifying route path) */
  selectByRoute(path: PathSegments) {
    const [name] = shiftPath(path)
    if (name == null) return
    return this.selectByName(name)
  }
  /** Get route path for the current selection */
  getRoute() {
    if (this.selected == null) return []
    return [this.selected.name]
  }
}
</script>

<script setup lang="ts">
import { ref, type Ref, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { shiftPath, type PathSegments } from '@/utils/route'
import type { Sprite } from '@/models/spx/sprite'
import EditorList from '../common/EditorList.vue'
import { UIEmpty, UIMenu, UIMenuItem } from '@/components/ui'
import { capture, useMessageHandle } from '@/utils/exception'
import { useAddSpriteResource, useAddAnimationByGroupingCostumes, useRenameAnimation } from '@/components/asset'
import AnimationDetail from './AnimationDetail.vue'
import ResourceWorkspace from './ResourceWorkspace.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import AnimationItem from './AnimationItem.vue'

const props = defineProps<{
  sprite: Sprite
  state: AnimationsEditorState
}>()

const editorCtx = useEditorCtx()
const addResource = useAddSpriteResource()
const handleAdd = useMessageHandle(() => addResource(props.sprite, 'animation')).fn
const groupCostumes = useAddAnimationByGroupingCostumes()
const handleImport = useMessageHandle(async () => {
  const animation = await groupCostumes(editorCtx.project, props.sprite)
  props.state.select(animation.id)
}).fn

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update animation order', zh: '更新动画顺序' } }
    await editorCtx.state.history.doAction(action, () => props.sprite.moveAnimation(oldIdx, newIdx))
  },
  {
    en: 'Failed to update animation order',
    zh: '更新动画顺序失败'
  }
).fn

const renameAnimation = useRenameAnimation()
const handleRename = useMessageHandle(renameAnimation, {
  en: 'Rename animation failed',
  zh: '重命名动画失败'
}).fn
</script>
