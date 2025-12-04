<template>
  <UIEmpty v-if="sprite.animations.length === 0" size="extra-large">
    {{ $t({ en: 'No animations', zh: '没有动画' }) }}
    <template #op>
      <UIButton
        v-radar="{ name: 'Group costumes button', desc: 'Click to group costumes as animation' }"
        type="boring"
        size="large"
        @click="handleGroupCostumes"
      >
        <template #icon>
          <img :src="galleryIcon" />
        </template>
        {{ $t({ en: 'Group costumes as animation', zh: '将造型合并为动画' }) }}
      </UIButton>
      <!-- <UIButton
        v-radar="{ name: 'Generate animation button', desc: 'Click to generate animation with AI' }"
        type="boring"
        size="large"
        @click="handleGenerateAnimation"
      >
        <template #icon>
          <img :src="galleryIcon" />
        </template>
        {{ $t({ en: 'Generate animation', zh: '生成动画' }) }}
      </UIButton> -->
    </template>
  </UIEmpty>
  <EditorList
    v-else
    v-radar="{ name: 'Animations management', desc: 'Managing animations of current sprite' }"
    color="sprite"
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
          v-radar="{ name: 'Group costumes option', desc: 'Click to group costumes as animation' }"
          @click="handleGroupCostumes"
          >{{ $t({ en: 'Group costumes as animation', zh: '将造型合并为动画' }) }}</UIMenuItem
        >
        <!-- <UIMenuItem
          v-radar="{ name: 'Generate animation option', desc: 'Click to generate animation with AI' }"
          @click="handleGenerateAnimation"
          >{{ $t({ en: 'Generate animation', zh: '生成动画' }) }}</UIMenuItem
        > -->
      </UIMenu>
    </template>
    <template #detail>
      <AnimationDetail v-if="state.selected != null" :animation="state.selected" :sprite="sprite" />
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
    if (animation == null) throw new Error(`Animation with name "${name}" not found`)
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
import type { Sprite } from '@/models/sprite'
import EditorList from '../common/EditorList.vue'
import { UIMenu, UIMenuItem, UIEmpty, UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useAddAnimationByGroupingCostumes } from '@/components/asset'
import AnimationDetail from './AnimationDetail.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import AnimationItem from './AnimationItem.vue'
import galleryIcon from './gallery.svg'

const props = defineProps<{
  sprite: Sprite
  state: AnimationsEditorState
}>()

const editorCtx = useEditorCtx()

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

// const generateAnimation = useAnimationGeneratorModal()
// const handleGenerateAnimation = useMessageHandle(
//   async () => {
//     const settings: AssetSettings = {
//       ...editorCtx.project.settings,
//       projectDescription: editorCtx.project.description ?? editorCtx.project.aiDescription ?? null,
//       description: null,
//       category: 'other'
//     }
//     const animation = await generateAnimation(props.sprite, settings)
//     props.state.select(animation.id)
//   },
//   {
//     en: 'Failed to generate animation',
//     zh: '生成动画失败'
//   }
// ).fn

const handleSorted = useMessageHandle(
  async (oldIdx: number, newIdx: number) => {
    const action = { name: { en: 'Update animation order', zh: '更新动画顺序' } }
    await editorCtx.project.history.doAction(action, () => props.sprite.moveAnimation(oldIdx, newIdx))
  },
  {
    en: 'Failed to update animation order',
    zh: '更新动画顺序失败'
  }
).fn
</script>
<style scoped lang="scss">
.background {
  width: 100%;
  height: 100%;
}
</style>
