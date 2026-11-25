<template>
  <EditorList
    v-radar="{ name: 'animations-management', desc: 'Managing animations of current sprite' }"
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
    <template v-if="state.drafts.length > 0" #drafts>
      <AnimationGenItem
        v-for="draft in state.drafts"
        :key="draft.id"
        :gen="draft.gen"
        :active="state.selectedDraft === draft"
        @click="state.select(draft.id)"
        @rename="renameDraft.fn(draft.gen)"
        @remove="editorCtx.state.genState.spriteResources.remove(draft)"
      />
    </template>
    <template #add-options>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'group-costumes-option', desc: 'Click to group costumes as animation' }"
          @click="handleGroupCostumes"
          >{{ $t({ en: 'Group costumes as animation', zh: '将造型合并为动画' }) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'generate-animation', desc: 'Generate an animation with AI' }"
          @click="addDraft.fn"
          >{{ $t({ en: 'Generate with AI', zh: '使用 AI 生成' }) }}</UIMenuItem
        >
      </UIMenu>
    </template>
    <template #detail>
      <SpriteResourceGenDetail
        v-if="state.selectedDraft != null"
        :key="state.selectedDraft.id"
        :draft="state.selectedDraft"
        @adopted="state.select($event)"
      />
      <AnimationDetail
        v-else-if="state.selected != null"
        :animation="state.selected"
        @rename="handleRename(state.selected)"
      />
      <UIEmpty v-else size="large">{{ $t({ en: 'Click + to add an animation', zh: '点击 + 添加动画' }) }}</UIEmpty>
    </template>
  </EditorList>
</template>

<script lang="ts">
export class AnimationsEditorState extends Disposable {
  constructor(
    private getSprite: () => Sprite | null,
    private spriteResources: SpriteResourceGens
  ) {
    super()
    this.selectedIdRef = ref(getSprite()?.animations[0]?.id ?? this.drafts[0]?.id ?? null)

    this.addDisposer(
      watch(
        () => [this.selected, this.selectedDraft, this.animations[0], this.drafts[0]],
        () => {
          if (this.selected == null && this.selectedDraft == null)
            this.select(this.animations[0]?.id ?? this.drafts[0]?.id ?? null)
        }
      )
    )
  }

  private selectedIdRef: Ref<string | null>

  private get animations() {
    return this.getSprite()?.animations ?? []
  }

  get drafts() {
    return this.spriteResources.draftsFor(this.getSprite(), AnimationGen)
  }

  get selectedDraft() {
    return this.drafts.find((d) => d.id === this.selectedIdRef.value) ?? null
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
    const [name, rest] = shiftPath(path)
    if (name === 'drafts' && rest.length === 1) {
      const draft = this.drafts.find((d) => d.id === rest[0])
      if (draft != null) this.select(draft.id)
      return
    }
    if (name == null) return
    return this.selectByName(name)
  }
  /** Get route path for the current selection */
  getRoute() {
    if (this.selectedDraft != null) return ['drafts', this.selectedDraft.id]
    if (this.selected == null) return []
    return [this.selected.name]
  }
}
</script>

<script setup lang="ts">
import { ref, type Ref, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { capture, useMessageHandle } from '@/utils/exception'
import { shiftPath, type PathSegments } from '@/utils/route'
import { useEnsureSignedIn } from '@/utils/user'
import { AnimationGen } from '@/models/spx/gen/animation-gen'
import type { Sprite } from '@/models/spx/sprite'
import { useAddAnimationByGroupingCostumes, useRenameAnimation, useRenameAnimationGen } from '@/components/asset'
import AnimationGenItem from '@/components/asset/gen/animation/AnimationGenItem.vue'
import { UIMenu, UIMenuItem, UIEmpty } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import EditorList from '../common/EditorList.vue'
import type { SpriteResourceGens } from '../sprite-resource-gens'
import AnimationDetail from './AnimationDetail.vue'
import AnimationItem from './AnimationItem.vue'
import SpriteResourceGenDetail from './SpriteResourceGenDetail.vue'

const props = defineProps<{
  sprite: Sprite
  state: AnimationsEditorState
}>()

const editorCtx = useEditorCtx()
const ensureSignedIn = useEnsureSignedIn()
const addDraft = useMessageHandle(
  async () => {
    await ensureSignedIn()
    props.state.select(editorCtx.state.genState.spriteResources.addAnimation(props.sprite).id)
  },
  { en: 'Failed to add animation', zh: '添加动画失败' }
)
const renameDraft = useMessageHandle(useRenameAnimationGen(), {
  en: 'Failed to rename animation',
  zh: '重命名动画失败'
})

const addAnimationByGroupingCostumes = useAddAnimationByGroupingCostumes()

const handleGroupCostumes = useMessageHandle(
  async () => {
    const animation = await addAnimationByGroupingCostumes(editorCtx.project, props.sprite)
    props.state.select(animation.id)
  },
  {
    en: 'Failed to group costumes as animation',
    zh: '将造型合并为动画失败'
  }
).fn

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
