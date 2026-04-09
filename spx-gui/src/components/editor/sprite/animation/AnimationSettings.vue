<template>
  <section class="flex justify-center">
    <UIDropdown
      trigger="manual"
      :visible="activeSetting != null"
      placement="top"
      @click-outside="handleClickOutside"
      @update:visible="handleDropdownVisibleUpdate"
    >
      <template #trigger>
        <ul class="flex items-center gap-1 rounded-sm bg-grey-100 p-1 shadow-small">
          <li
            v-radar="{ name: 'Edit duration', desc: 'Click to edit animation duraion' }"
            class="h-8 cursor-pointer flex items-center gap-1 rounded-sm px-3 text-12 text-text transition-all"
            :class="activeSetting === 'duration' ? 'bg-primary-200 text-primary-main' : ''"
            @click="handleSummaryClick('duration')"
          >
            <UIIcon type="timer" />
            {{ $t({ en: 'Duration', zh: '时长' }) }}
            <span
              class="max-w-[5em] overflow-x-hidden rounded-full bg-grey-400 px-1.25 text-10/[1.6] whitespace-nowrap text-ellipsis text-grey-800"
            >
              {{ formatDuration(animation.duration, 2) }}
            </span>
          </li>
          <li
            v-radar="{ name: 'Edit bound state', desc: 'Click to edit animation bound state' }"
            class="h-8 cursor-pointer flex items-center gap-1 rounded-sm px-3 text-12 text-text transition-all"
            :class="activeSetting === 'bound-state' ? 'bg-primary-200 text-primary-main' : ''"
            @click="handleSummaryClick('bound-state')"
          >
            <UIIcon type="status" />
            {{ $t({ en: 'Binding', zh: '绑定' }) }}
            <span
              v-if="boundStateNum > 0"
              class="max-w-[5em] overflow-x-hidden rounded-full bg-grey-400 px-1.25 text-10/[1.6] whitespace-nowrap text-ellipsis text-grey-800"
            >
              {{ boundStateNum }}
            </span>
          </li>
          <li
            v-if="soundEditable"
            v-radar="{ name: 'Edit sound', desc: 'Click to edit animation sound' }"
            class="h-8 cursor-pointer flex items-center gap-1 rounded-sm px-3 text-12 text-text transition-all"
            :class="activeSetting === 'sound' ? 'bg-primary-200 text-primary-main' : ''"
            @click="handleSummaryClick('sound')"
          >
            <UIIcon type="sound" />
            {{ $t({ en: 'Sound', zh: '声音' }) }}
            <span
              class="max-w-[5em] overflow-x-hidden rounded-full bg-grey-400 px-1.25 text-10/[1.6] whitespace-nowrap text-ellipsis text-grey-800"
            >
              {{ soundName }}
            </span>
          </li>
        </ul>
      </template>
      <DurationEditor v-if="activeSetting === 'duration'" :animation="animation" @close="handleEditorClose" />
      <BoundStateEditor v-if="activeSetting === 'bound-state'" :animation="animation" @close="handleEditorClose" />
      <SoundEditor v-if="activeSetting === 'sound'" :animation="animation" @close="handleEditorClose" />
    </UIDropdown>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDuration } from '@/utils/audio'
import type { Animation } from '@/models/spx/animation'
import { UIDropdown, UIIcon, isInPopup } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import DurationEditor from './DurationEditor.vue'
import BoundStateEditor from './state/BoundStateEditor.vue'
import SoundEditor from './SoundEditor.vue'

const props = defineProps<{
  animation: Animation
  /** If it is supported to edit sound of the animation */
  soundEditable: boolean
}>()

const editorCtx = useEditorCtx()
const soundName = computed(() => editorCtx.project.sounds.find((s) => s.id === props.animation.sound)?.name)

type Setting = 'duration' | 'bound-state' | 'sound'

const activeSetting = ref<Setting | null>(null)

function handleSummaryClick(setting: Setting) {
  activeSetting.value = activeSetting.value === setting ? null : setting
}

function handleEditorClose() {
  activeSetting.value = null
}

const boundStateNum = computed(() => {
  const { sprite, id } = props.animation
  if (sprite == null) return 0
  return sprite.getAnimationBoundStates(id).length
})

function handleClickOutside(e: MouseEvent) {
  // There are popups (dropdown, modal, ...) in setting editor (e.g. "Record" in `SoundEditor`), we should not close the editor when user clicks in the popup content.
  // TODO: There should be a systematical solution for this, something like event propagation along the component tree instead of DOM tree.
  if (isInPopup(e.target as HTMLElement | null)) return
  activeSetting.value = null
}

function handleDropdownVisibleUpdate(visible: boolean) {
  if (!visible) activeSetting.value = null
}
</script>
