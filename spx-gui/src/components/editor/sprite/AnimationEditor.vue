<template>
  <UIEmpty v-if="sprite.animations.length === 0" size="extra-large">
    {{ $t({ en: 'No animations', zh: '没有动画' }) }}
    <template #op>
      <UIButton
        v-radar="{ name: 'Generate animation', desc: 'Generate a new animation with AI' }"
        type="primary"
        size="large"
        @click="handleGenerate"
      >
        {{ $t({ en: 'Generate with AI', zh: '使用 AI 生成' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Group costumes button', desc: 'Click to group costumes as animation' }"
        type="neutral"
        size="large"
        @click="handleGroupCostumes"
      >
        <template #icon>
          <img :src="galleryIcon" />
        </template>
        {{ $t({ en: 'Group costumes as animation', zh: '将造型合并为动画' }) }}
      </UIButton>
    </template>
  </UIEmpty>
  <EditorList
    v-else
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
          v-radar="{ name: 'Generate resource', desc: 'Generate a new resource with AI' }"
          @click="handleGenerate"
        >
          {{ $t({ en: 'Generate with AI', zh: '使用 AI 生成' }) }}
        </UIMenuItem>
        <UIMenuItem
          v-radar="{ name: 'Group costumes option', desc: 'Click to group costumes as animation' }"
          @click="handleGroupCostumes"
          >{{ $t({ en: 'Group costumes as animation', zh: '将造型合并为动画' }) }}</UIMenuItem
        >
      </UIMenu>
    </template>
    <template #detail>
      <div v-if="state.selected != null" class="min-h-0 min-w-0 flex-1 flex flex-col bg-grey-200">
        <AnimationDetail :animation="state.selected" @rename="handleRename(state.selected)" />
        <div class="flex-none px-5 pb-5">
          <SpriteResourcePrompt :key="state.selected.id" :sprite="sprite" :resource="state.selected" />
        </div>
      </div>
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
import { UIMenu, UIMenuItem, UIEmpty, UIButton } from '@/components/ui'
import { capture, useMessageHandle } from '@/utils/exception'
import { useGenerateSpriteResource, useAddAnimationByGroupingCostumes, useRenameAnimation } from '@/components/asset'
import AnimationDetail from './AnimationDetail.vue'
import SpriteResourcePrompt from './SpriteResourcePrompt.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import AnimationItem from './AnimationItem.vue'
import galleryIcon from './gallery.svg'

const props = defineProps<{
  sprite: Sprite
  state: AnimationsEditorState
}>()

const editorCtx = useEditorCtx()
const generateResource = useGenerateSpriteResource()
const handleGenerate = useMessageHandle(() => generateResource(props.sprite, 'animation')).fn

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
