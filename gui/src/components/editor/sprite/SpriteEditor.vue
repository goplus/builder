<template>
  <EditorHeader>
    <UITabs
      v-radar="{
        name: 'sprite-editor-tabs',
        desc: 'Navigation tabs for switching between different sprite editing views'
      }"
      :value="state.selected.type"
      @update:value="(type) => state.select(type as SelectedType)"
    >
      <UITab v-radar="{ name: 'code-tab', desc: 'Click to switch to code editing view' }" value="code">{{
        $t({ en: 'Code', zh: '代码' })
      }}</UITab>
      <UITab v-radar="{ name: 'costumes-tab', desc: 'Click to switch to costumes management view' }" value="costumes">{{
        $t({ en: 'Costumes', zh: '造型' })
      }}</UITab>
      <UITab
        v-radar="{ name: 'animations-tab', desc: 'Click to switch to animations management view' }"
        value="animations"
        >{{ $t({ en: 'Animations', zh: '动画' }) }}</UITab
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
      name: 'code-editor',
      desc: 'Code editor for editing code of current sprite',
      visible: state.selected.type === 'code'
    }"
    :code-file-path="sprite.codeFilePath"
  />
  <CostumesEditor v-if="state.selected.type === 'costumes'" :sprite="sprite" :state="state.costumesState" />
  <!-- We use v-if to prevent AnimationEditor from running in the background -->
  <AnimationEditor v-if="state.selected.type === 'animations'" :sprite="sprite" :state="state.animationsState" />
</template>

<script lang="ts">
export type SelectedType = 'code' | 'costumes' | 'animations'

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

export class SpriteEditorState extends Disposable {
  constructor(getSprite: () => Sprite | null, spriteResources: SpriteResourceGens, initialSelected?: Selected) {
    super()
    this.costumesState = new CostumesEditorState(getSprite, spriteResources)
    this.addDisposable((this.animationsState = new AnimationsEditorState(getSprite, spriteResources)))
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

  private resourceEditor(type: 'costumes' | 'animations') {
    return type === 'costumes' ? this.costumesState : this.animationsState
  }

  /** Select a target (by specifying route path) */
  selectByRoute(path: PathSegments) {
    const [type, extra] = shiftPath(path)
    if (type === 'code' || type == null) return this.select('code')
    if (type !== 'costumes' && type !== 'animations') throw new Error(`Unknown type: ${type}`)
    this.select(type)
    const editor = this.resourceEditor(type)
    const [name, rest] = shiftPath(extra)
    if (name === 'drafts' && rest.length === 1) {
      const draft = editor.drafts.find((d) => d.id === rest[0])
      if (draft != null) editor.select(draft.id)
    } else if (name != null) {
      editor.selectByName(name)
    }
  }
  /** Get route path for the current selection */
  getRoute(): PathSegments {
    const type = this.selectedTypeRef.value
    if (type === 'code') return [type]
    const editor = this.resourceEditor(type)
    if (editor.selectedDraft != null) return [type, 'drafts', editor.selectedDraft.id]
    if (editor.selected == null) return [type]
    return [type, editor.selected.name]
  }
}
</script>

<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { Disposable } from '@/utils/disposable'
import { shiftPath, type PathSegments } from '@/utils/route'
import type { Animation } from '@/models/spx/animation'
import type { Costume } from '@/models/spx/costume'
import { type Sprite } from '@/models/spx/sprite'
import { UITabs, UITab } from '@/components/ui'
import EditorHeader from '../common/EditorHeader.vue'
import type { SpriteResourceGens } from '../sprite-resource-gens'
import { CodeEditorUI, FormatButton } from '../spx-code-editor'
import AnimationEditor, { AnimationsEditorState } from './AnimationEditor.vue'
import CostumesEditor, { CostumesEditorState } from './CostumesEditor.vue'

defineProps<{
  sprite: Sprite
  state: SpriteEditorState
}>()
</script>
