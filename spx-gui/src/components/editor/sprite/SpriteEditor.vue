<template>
  <EditorHeader>
    <UITabs
      v-radar="{
        name: 'Sprite editor tabs',
        desc: 'Navigation tabs for switching between different sprite editing views'
      }"
      :value="state.selected.type"
      color="sprite"
      @update:value="(type) => state.select(type as SelectedType)"
    >
      <UITab v-radar="{ name: 'Code tab', desc: 'Click to switch to code editing view' }" value="code">{{
        $t({ en: 'Code', zh: '代码' })
      }}</UITab>
      <UITab v-radar="{ name: 'Costumes tab', desc: 'Click to switch to costumes management view' }" value="costumes">{{
        $t({ en: 'Costumes', zh: '造型' })
      }}</UITab>
      <UITab
        v-radar="{ name: 'Animations tab', desc: 'Click to switch to animations management view' }"
        value="animations"
        >{{ $t({ en: 'Animations', zh: '动画' }) }}</UITab
      >
      <UITab
        v-if="canConfigurePhysics"
        v-radar="{
          name: 'Physics tab',
          desc: 'Click to switch to physics settings, which includes collider, pivot editing, etc.'
        }"
        value="physics"
        >{{ $t({ en: 'Physics', zh: '物理' }) }}</UITab
      >
    </UITabs>
    <template #extra>
      <FormatButton v-if="state.selected.type === 'code'" :code-file-path="sprite.codeFilePath" />
    </template>
  </EditorHeader>
  <CodeEditorUI
    v-show="state.selected.type === 'code'"
    ref="codeEditor"
    v-radar="{
      name: 'Code editor',
      desc: 'Code editor for editing code of current sprite',
      visible: state.selected.type === 'code'
    }"
    :code-file-path="sprite.codeFilePath"
  />
  <CostumesEditor v-if="state.selected.type === 'costumes'" :sprite="sprite" :state="state.costumesState" />
  <!-- We use v-if to prevent AnimationEditor from running in the background -->
  <AnimationEditor v-if="state.selected.type === 'animations'" :sprite="sprite" :state="state.animationsState" />
  <SpritePhysicsEditor v-if="state.selected.type === 'physics'" :sprite="sprite" />
</template>

<script lang="ts">
export type SelectedType = 'code' | 'costumes' | 'animations' | 'physics'

export type Selected =
  | {
      type: 'code'
    }
  | {
      type: 'costumes'
      costume: Costume | null
    }
  | {
      type: 'animations'
      animation: Animation | null
    }
  | {
      type: 'physics'
    }

export class SpriteEditorState extends Disposable {
  constructor(getSprite: () => Sprite | null, initialSelected?: Selected) {
    super()
    this.costumesState = new CostumesEditorState(getSprite)
    this.addDisposable((this.animationsState = new AnimationsEditorState(getSprite)))
    this.selectedTypeRef = ref(initialSelected?.type ?? 'code')
  }

  costumesState: CostumesEditorState
  animationsState: AnimationsEditorState
  private selectedTypeRef: Ref<SelectedType>

  /** The current selection */
  get selected(): Selected {
    switch (this.selectedTypeRef.value) {
      case 'code':
        return { type: 'code' }
      case 'costumes':
        return { type: 'costumes', costume: this.costumesState.selected }
      case 'animations':
        return { type: 'animations', animation: this.animationsState.selected }
      case 'physics':
        return { type: 'physics' }
      default:
        throw new Error(`Unknown selected type: ${this.selectedTypeRef.value}`)
    }
  }

  get selectedCostume() {
    if (this.selectedTypeRef.value !== 'costumes') return null
    return this.costumesState.selected
  }

  get selectedAnimation() {
    if (this.selectedTypeRef.value !== 'animations') return null
    return this.animationsState.selected
  }

  /** Select a target */
  select(type: SelectedType) {
    this.selectedTypeRef.value = type
  }

  selectCostume(costumeId: string) {
    this.select('costumes')
    this.costumesState.select(costumeId)
  }

  selectAnimation(animationId: string) {
    this.select('animations')
    this.animationsState.select(animationId)
  }

  /** Select a target (by specifying route path) */
  selectByRoute(path: PathSegments) {
    const [type, extra] = shiftPath(path)
    switch (type) {
      case 'code':
      case null:
        this.select('code')
        break
      case 'costumes':
        this.select('costumes')
        this.costumesState.selectByRoute(extra)
        break
      case 'animations':
        this.select('animations')
        this.animationsState.selectByRoute(extra)
        break
      case 'physics':
        this.select('physics')
        break
      default:
        throw new Error(`Unknown type: ${type}`)
    }
  }
  /** Get route path for the current selection */
  getRoute(): PathSegments {
    switch (this.selected.type) {
      case 'code':
        return ['code']
      case 'costumes':
        return ['costumes', ...this.costumesState.getRoute()]
      case 'animations':
        return ['animations', ...this.animationsState.getRoute()]
      case 'physics':
        return ['physics']
    }
  }
}
</script>

<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { Disposable } from '@/utils/disposable'
import { shiftPath, type PathSegments } from '@/utils/route'
import type { Costume } from '@/models/costume'
import type { Animation } from '@/models/animation'
import { PhysicsMode, type Sprite } from '@/models/sprite'
import { UITabs, UITab } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import CodeEditorUI from '../code-editor/ui/CodeEditorUI.vue'
import FormatButton from '../code-editor/FormatButton.vue'
import EditorHeader from '../common/EditorHeader.vue'
import CostumesEditor, { CostumesEditorState } from './CostumesEditor.vue'
import AnimationEditor, { AnimationsEditorState } from './AnimationEditor.vue'
import SpritePhysicsEditor from './SpritePhysicsEditor.vue'

const props = defineProps<{
  sprite: Sprite
  state: SpriteEditorState
}>()

const editorCtx = useEditorCtx()

const canConfigurePhysics = computed(() => {
  return editorCtx.project.stage.physics.enabled && props.sprite.physicsMode !== PhysicsMode.NoPhysics
})
</script>
