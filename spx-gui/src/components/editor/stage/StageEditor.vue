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
      <UITab v-radar="{ name: 'Widgets tab', desc: 'Click to switch to widgets management view' }" value="widgets">
        {{ $t({ en: 'Widgets', zh: '控件' }) }}
      </UITab>
      <UITab v-radar="{ name: 'Sounds tab', desc: 'Click to switch to sounds management view' }" value="sounds">
        {{ $t({ en: 'Sounds', zh: '声音' }) }}
      </UITab>
      <UITab
        v-radar="{ name: 'Backdrops tab', desc: 'Click to switch to backdrops management view' }"
        value="backdrops"
      >
        {{ $t({ en: 'Backdrops', zh: '背景' }) }}
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
  <WidgetsEditor v-if="state.selected.type === 'widgets'" :state="state.widgetsState" />
  <SoundsEditor v-else-if="state.selected.type === 'sounds'" :state="state.soundsState" />
  <BackdropsEditor v-else-if="state.selected.type === 'backdrops'" :state="state.backdropsState" />
</template>

<script lang="ts">
export type SelectedType = 'code' | 'widgets' | 'sounds' | 'backdrops'

export type Selected =
  | {
      type: 'code'
    }
  | {
      type: 'widgets'
      widget: Widget | null
    }
  | {
      type: 'sounds'
      sound: Sound | null
    }
  | {
      type: 'backdrops'
      backdrop: Backdrop | null
    }

export class StageEditorState extends Disposable {
  constructor(getStage: () => Stage, getSounds: () => Sound[]) {
    super()
    this.soundsState = new SoundsEditorState(getSounds)
    this.widgetsState = new WidgetsEditorState(getStage)
    this.backdropsState = new BackdropsEditorState(getStage)

    this.addDisposable(this.widgetsState)

    this.addDisposer(
      watch(
        () => this.widgetsState.selected,
        (selectedWidget) => {
          if (selectedWidget != null) {
            this.select('widgets')
          }
        }
      )
    )
  }

  widgetsState: WidgetsEditorState
  soundsState: SoundsEditorState
  backdropsState: BackdropsEditorState
  private selectedTypeRef = ref<SelectedType>('code')

  get selectedWidget() {
    if (this.selectedTypeRef.value !== 'widgets') return null
    return this.widgetsState.selected
  }

  get selectedSound() {
    if (this.selectedTypeRef.value !== 'sounds') return null
    return this.soundsState.selected
  }

  get selectedBackdrop() {
    if (this.selectedTypeRef.value !== 'backdrops') return null
    return this.backdropsState.selected
  }

  /** The current selection */
  get selected(): Selected {
    switch (this.selectedTypeRef.value) {
      case 'code':
        return { type: 'code' }
      case 'widgets':
        return { type: 'widgets', widget: this.widgetsState.selected }
      case 'sounds':
        return { type: 'sounds', sound: this.soundsState.selected }
      case 'backdrops':
        return { type: 'backdrops', backdrop: this.backdropsState.selected }
      default:
        throw new Error(`Unknown selected type: ${this.selectedTypeRef.value}`)
    }
  }
  /** Select a target */
  select(type: SelectedType) {
    this.selectedTypeRef.value = type
  }

  selectWidget(widgetId: string) {
    this.select('widgets')
    this.widgetsState.select(widgetId)
  }

  selectSound(soundId: string) {
    this.select('sounds')
    this.soundsState.select(soundId)
  }

  selectBackdrop(backdropId: string) {
    this.select('backdrops')
    this.backdropsState.select(backdropId)
  }

  /** Select a target (by specifying route path) */
  selectByRoute(path: PathSegments) {
    const [type, extra] = shiftPath(path)
    switch (type) {
      case 'code':
      case null:
        this.select('code')
        break
      case 'widgets':
        this.select('widgets')
        this.widgetsState.selectByRoute(extra)
        break
      case 'sounds': {
        this.select('sounds')
        this.soundsState.selectByRoute(extra)
        break
      }
      case 'backdrops':
        this.select('backdrops')
        this.backdropsState.selectByRoute(extra)
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
      case 'widgets':
        return ['widgets', ...this.widgetsState.getRoute()]
      case 'sounds':
        return ['sounds', ...this.soundsState.getRoute()]
      case 'backdrops':
        return ['backdrops', ...this.backdropsState.getRoute()]
    }
  }
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { shiftPath, type PathSegments } from '@/utils/route'
import type { Widget } from '@/models/spx/widget'
import type { Sound } from '@/models/spx/sound'
import type { Backdrop } from '@/models/spx/backdrop'
import type { Stage } from '@/models/spx/stage'
import { UITabs, UITab } from '@/components/ui'
import { CodeEditorUI, FormatButton } from '../code-editor/spx-code-editor'
import EditorHeader from '../common/EditorHeader.vue'
import BackdropsEditor, { BackdropsEditorState } from './backdrop/BackdropsEditor.vue'
import WidgetsEditor, { WidgetsEditorState } from './widget/WidgetsEditor.vue'
import SoundsEditor from './sound/SoundsEditor.vue'
import { SoundsEditorState } from './sound/sounds-editor-state'
import BackdropModeSelector from './backdrop/BackdropModeSelector.vue'

defineProps<{
  stage: Stage
  state: StageEditorState
}>()
</script>
