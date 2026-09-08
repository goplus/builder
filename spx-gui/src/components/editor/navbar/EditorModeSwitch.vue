<script setup lang="ts">
import { computed } from 'vue'
import { UIButtonGroup, UIButtonGroupItem, UITooltip } from '@/components/ui'
import { EditMode, type EditorState } from '../editor-state'
import defaultModeSvg from './icons/default-mode.svg?raw'
import mapEditModeSvg from './icons/map-edit-mode.svg?raw'

const props = defineProps<{
  state: EditorState | null
}>()

const selectedEditMode = computed(() => props.state?.selectedEditMode ?? EditMode.Default)
</script>

<!-- eslint-disable vue/no-v-html -->
<template>
  <UIButtonGroup
    v-radar="{ name: 'Editor mode menu', desc: 'Hover to see editor mode options (default, map)' }"
    class="mx-3 items-center"
    type="icon"
    variant="secondary"
    :value="selectedEditMode"
    @update:value="(v) => state?.selectEditMode(v as EditMode)"
  >
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
