<template>
  <EditorHeader color="stage">
    <UITabs
      v-radar="{
        name: 'Stage editor tabs',
        desc: 'Navigation tabs for switching between different stage editing views'
      }"
      :value="state.selected.type"
      color="stage"
      @update:value="(type) => state.select(type as SelectedType)"
    >
      <UITab v-radar="{ name: 'Code tab', desc: 'Click to switch to code editing view' }" value="code">
        {{ $t({ en: 'Code', zh: '代码' }) }}
      </UITab>
      <UITab
        v-radar="{ name: 'Backdrops tab', desc: 'Click to switch to backdrops management view' }"
        value="backdrops"
      >
        {{ $t({ en: 'Backdrops', zh: '背景' }) }}
      </UITab>
      <UITab v-radar="{ name: 'Sounds tab', desc: 'Click to switch to sounds management view' }" value="sounds">
        {{ $t({ en: 'Sounds', zh: '声音' }) }}
      </UITab>
      <UITab v-radar="{ name: 'Widgets tab', desc: 'Click to switch to widgets management view' }" value="widgets">
        {{ $t({ en: 'Widgets', zh: '控件' }) }}
      </UITab>
    </UITabs>
    <template #extra>
      <FormatButton v-if="state.selected.type === 'code'" :code-file-path="stage.codeFilePath" />
      <BackdropModeSelector v-if="state.selected.type === 'backdrops'" />
    </template>
  </EditorHeader>
  <CodeEditorUI
    v-show="state.selected.type === 'code'"
    ref="codeEditor"
    v-radar="{
      name: 'Code editor',
      desc: 'Code editor for editing stage code',
      visible: state.selected.type === 'code'
    }"
    :code-file-path="stage.codeFilePath"
  />
  <BackdropsEditor v-if="state.selected.type === 'backdrops'" :state="state.backdropsState" />
  <SoundsEditor v-else-if="state.selected.type === 'sounds'" :state="state.soundsState" />
  <WidgetsEditor v-else-if="state.selected.type === 'widgets'" :state="state.widgetsState" />
</template>

<script lang="ts">
export type SelectedType = 'code' | 'backdrops' | 'sounds' | 'widgets'

export type Selected =
  | {
      type: 'code'
    }
  | {
      type: 'backdrops'
      backdrop: Backdrop | null
    }
  | {
      type: 'sounds'
      sound: Sound | null
    }
  | {
      type: 'widgets'
      widget: Widget | null
    }

export class StageEditorState extends Disposable {
  constructor(getStage: () => Stage, getSounds: () => Sound[]) {
    super()
    this.backdropsState = new BackdropsEditorState(getStage)
    this.soundsState = new SoundsEditorState(getSounds)
    this.widgetsState = new WidgetsEditorState(getStage)

    this.addDisposable(this.soundsState)
    this.addDisposable(this.widgetsState)
  }

  backdropsState: BackdropsEditorState
  soundsState: SoundsEditorState
  widgetsState: WidgetsEditorState
  private selectedTypeRef = ref<SelectedType>('code')

  get selectedBackdrop() {
    if (this.selectedTypeRef.value !== 'backdrops') return null
    return this.backdropsState.selected
  }

  get selectedSound() {
    if (this.selectedTypeRef.value !== 'sounds') return null
    return this.soundsState.selected
  }

  get selectedWidget() {
    if (this.selectedTypeRef.value !== 'widgets') return null
    return this.widgetsState.selected
  }

  /** The current selection */
  get selected(): Selected {
    switch (this.selectedTypeRef.value) {
      case 'code':
        return { type: 'code' }
      case 'backdrops':
        return { type: 'backdrops', backdrop: this.backdropsState.selected }
      case 'sounds':
        return { type: 'sounds', sound: this.soundsState.selected }
      case 'widgets':
        return { type: 'widgets', widget: this.widgetsState.selected }
      default:
        throw new Error(`Unknown selected type: ${this.selectedTypeRef.value}`)
    }
  }
  /** Select a target */
  select(type: SelectedType) {
    this.selectedTypeRef.value = type
  }

  selectBackdrop(backdropId: string) {
    this.select('backdrops')
    this.backdropsState.select(backdropId)
  }

  selectSound(soundId: string) {
    this.select('sounds')
    this.soundsState.select(soundId)
  }

  selectWidget(widgetId: string) {
    this.select('widgets')
    this.widgetsState.select(widgetId)
  }

  /** Select a target (by specifying route path) */
  selectByRoute(path: PathSegments) {
    const [type, extra] = shiftPath(path)
    switch (type) {
      case 'code':
      case null:
        this.select('code')
        break
      case 'backdrops':
        this.select('backdrops')
        this.backdropsState.selectByRoute(extra)
        break
      case 'sounds': {
        this.select('sounds')
        this.soundsState.selectByRoute(extra)
        break
      }
      case 'widgets':
        this.select('widgets')
        this.widgetsState.selectByRoute(extra)
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
      case 'backdrops':
        return ['backdrops', ...this.backdropsState.getRoute()]
      case 'sounds':
        return ['sounds', ...this.soundsState.getRoute()]
      case 'widgets':
        return ['widgets', ...this.widgetsState.getRoute()]
    }
  }
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { Disposable } from '@/utils/disposable'
import { shiftPath, type PathSegments } from '@/utils/route'
import type { Stage } from '@/models/spx/stage'
import type { Backdrop } from '@/models/spx/backdrop'
import type { Sound } from '@/models/spx/sound'
import type { Widget } from '@/models/spx/widget'
import { UITabs, UITab } from '@/components/ui'
import { CodeEditorUI, FormatButton } from '../code-editor/spx-code-editor'
import EditorHeader from '../common/EditorHeader.vue'
import BackdropsEditor, { BackdropsEditorState } from './backdrop/BackdropsEditor.vue'
import SoundsEditor from './sound/SoundsEditor.vue'
import { SoundsEditorState } from './sound/sounds-editor-state'
import WidgetsEditor, { WidgetsEditorState } from './widget/WidgetsEditor.vue'
import BackdropModeSelector from './backdrop/BackdropModeSelector.vue'

defineProps<{
  stage: Stage
  state: StageEditorState
}>()
</script>
