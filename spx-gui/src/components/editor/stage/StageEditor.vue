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
      <UITab v-radar="{ name: 'Code tab', desc: 'Click to switch to code editing view' }" value="code">{{
        $t({ en: 'Code', zh: '代码' })
      }}</UITab>
      <UITab v-radar="{ name: 'Widgets tab', desc: 'Click to switch to widgets management view' }" value="widgets">{{
        $t({ en: 'Widgets', zh: '控件' })
      }}</UITab>
      <UITab
        v-radar="{ name: 'Backdrops tab', desc: 'Click to switch to backdrops management view' }"
        value="backdrops"
        >{{ $t({ en: 'Backdrops', zh: '背景' }) }}</UITab
      >
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
  <BackdropsEditor v-if="state.selected.type === 'backdrops'" :state="state.backdropsState" />
</template>

<script lang="ts">
export type SelectedType = 'code' | 'widgets' | 'backdrops'

export type Selected =
  | {
      type: 'code'
    }
  | {
      type: 'widgets'
      widget: Widget | null
    }
  | {
      type: 'backdrops'
      backdrop: Backdrop | null
    }

export class StageEditorState extends Disposable {
  constructor(stage: Stage) {
    super()
    this.widgetsState = new WidgetsEditorState(stage)
    this.backdropsState = new BackdropsEditorState(stage)

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
  backdropsState: BackdropsEditorState
  private selectedTypeRef = ref<SelectedType>('code')

  get selectedWidget() {
    if (this.selectedTypeRef.value !== 'widgets') return null
    return this.widgetsState.selected
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
import type { Widget } from '@/models/widget'
import type { Backdrop } from '@/models/backdrop'
import type { Stage } from '@/models/stage'
import { UITabs, UITab } from '@/components/ui'
import CodeEditorUI from '../code-editor/ui/CodeEditorUI.vue'
import FormatButton from '../code-editor/FormatButton.vue'
import EditorHeader from '../common/EditorHeader.vue'
import BackdropsEditor, { BackdropsEditorState } from './backdrop/BackdropsEditor.vue'
import WidgetsEditor, { WidgetsEditorState } from './widget/WidgetsEditor.vue'
import BackdropModeSelector from './backdrop/BackdropModeSelector.vue'

defineProps<{
  stage: Stage
  state: StageEditorState
}>()
</script>
