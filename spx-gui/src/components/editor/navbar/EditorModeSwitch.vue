<script setup lang="ts">
/**
 * Purpose: the "Default / Map" edit-mode switch of the Project Editor. Extracted from `EditorNavbar.vue` so the
 * Course Editor can show the same switch in its own navbar while the embedded learner project is open.
 *
 * Props:
 * - `state` - The `EditorState` whose `selectedEditMode` is displayed and changed; null while no project editor
 *   is active (the switch then shows `EditMode.Default` and clicks are no-ops).
 *
 * Emits: none (the mode is applied directly through `state.selectEditMode`; the editor state's route sync turns
 * the change into a route update when it is active).
 *
 * Used by: components/editor/navbar/EditorNavbar.vue#template (right slot),
 * components/course-editor/CourseEditor.vue#template (right slot, only when `doc.type === 'project'`).
 *
 * Uses: components/ui (`UIButtonGroup`, `UIButtonGroupItem`, `UITooltip`),
 * components/editor/editor-state.ts (`EditMode`, `EditorState.selectedEditMode`, `EditorState.selectEditMode`),
 * and the inline SVG icons `./icons/default-mode.svg`, `./icons/map-edit-mode.svg` (imported as raw markup).
 */
import { computed } from 'vue'
import { UIButtonGroup, UIButtonGroupItem, UITooltip } from '@/components/ui'
import { EditMode, type EditorState } from '../editor-state'
import defaultModeSvg from './icons/default-mode.svg?raw'
import mapEditModeSvg from './icons/map-edit-mode.svg?raw'

const props = defineProps<{
  state: EditorState | null
}>()

/**
 * The edit mode to highlight in the button group: the state's current mode, or `EditMode.Default` when there is
 * no editor state (so the group never renders with an undefined value).
 * @returns An `EditMode` value.
 * Called by: EditorModeSwitch.vue#template (`:value` of `UIButtonGroup`).
 */
const selectedEditMode = computed(() => props.state?.selectedEditMode ?? EditMode.Default)
</script>

<!-- eslint-disable vue/no-v-html -->
<template>
  <!--
    Icon button group holding one item per edit mode. `:value` reflects the current mode; `@update:value` is the
    click handler: it forwards the clicked item's value to `state.selectEditMode` (no-op while `state` is null).
    The `as EditMode` cast is safe because every item's `:value` below is an `EditMode` member.
  -->
  <UIButtonGroup
    v-radar="{ name: 'Editor mode menu', desc: 'Hover to see editor mode options (default, map)' }"
    class="mx-3 items-center"
    type="icon"
    variant="secondary"
    :value="selectedEditMode"
    @update:value="(v) => state?.selectEditMode(v as EditMode)"
  >
    <!-- Default mode item: code editing plus per-entity resources; the tooltip names the mode. -->
    <UITooltip>
      <template #trigger>
        <UIButtonGroupItem
          v-radar="{
            name: 'Default mode',
            desc: 'Editor for defining the behavior and resources of independent entities (Sprites, Sounds, Stage). It features code editing, internal resource (Costumes, Animations, Backdrops, Widgets) management, and game running/debugging'
          }"
          :value="EditMode.Default"
        >
          <div class="w-4.5 flex [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" v-html="defaultModeSvg"></div>
        </UIButtonGroupItem>
      </template>
      {{ $t({ en: 'Default mode', zh: '默认模式' }) }}
    </UITooltip>
    <!-- Map edit mode item: stage-centric placement and global configuration; the tooltip names the mode. -->
    <UITooltip>
      <template #trigger>
        <UIButtonGroupItem
          v-radar="{
            name: 'Map edit mode',
            desc: 'Map-centric editor for the game\'s spatial arrangement. It features sprite placement on the stage and global configuration (map size, physics, layer sorting, etc.)'
          }"
          :value="EditMode.Map"
        >
          <div class="w-4.5 flex [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" v-html="mapEditModeSvg"></div>
        </UIButtonGroupItem>
      </template>
      {{ $t({ en: 'Map edit mode', zh: '地图编辑模式' }) }}
    </UITooltip>
  </UIButtonGroup>
</template>
