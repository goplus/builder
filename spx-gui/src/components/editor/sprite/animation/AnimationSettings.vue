<template>
  <section class="wrapper">
    <UIDropdown
      trigger="manual"
      :visible="activeSetting != null"
      placement="top"
      @click-outside="handleClickOutside"
      @update:visible="handleDropdownVisibleUpdate"
    >
      <template #trigger>
        <ul class="settings">
          <li
            v-radar="{ name: 'Edit duration', desc: 'Click to edit animation duraion' }"
            class="setting"
            :class="{ active: activeSetting === 'duration' }"
            @click="handleSummaryClick('duration')"
          >
            <UIIcon type="timer" />
            {{ $t({ en: 'Duration', zh: '时长' }) }}
            <span class="value">{{ formatDuration(animation.duration, 2) }}</span>
          </li>
          <li
            v-radar="{ name: 'Edit bound state', desc: 'Click to edit animation bound state' }"
            class="setting"
            :class="{ active: activeSetting === 'bound-state' }"
            @click="handleSummaryClick('bound-state')"
          >
            <UIIcon type="status" />
            {{ $t({ en: 'Binding', zh: '绑定' }) }}
            <span v-if="boundStateNum > 0" class="value">{{ boundStateNum }}</span>
          </li>
          <li
            v-radar="{ name: 'Edit sound', desc: 'Click to edit animation sound' }"
            class="setting"
            :class="{ active: activeSetting === 'sound' }"
            @click="handleSummaryClick('sound')"
          >
            <UIIcon type="sound" />
            {{ $t({ en: 'Sound', zh: '声音' }) }}
            <span class="value">{{ soundName }}</span>
          </li>
        </ul>
      </template>
      <DurationEditor v-if="activeSetting === 'duration'" :animation="animation" @close="handleEditorClose" />
      <BoundStateEditor
        v-if="activeSetting === 'bound-state'"
        :animation="animation"
        :sprite="sprite"
        @close="handleEditorClose"
      />
      <SoundEditor v-if="activeSetting === 'sound'" :animation="animation" @close="handleEditorClose" />
    </UIDropdown>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDuration } from '@/utils/audio'
import type { Sprite } from '@/models/sprite'
import type { Animation } from '@/models/animation'
import { UIDropdown, UIIcon, isInPopup } from '@/components/ui'
import DurationEditor from './DurationEditor.vue'
import BoundStateEditor from './state/BoundStateEditor.vue'
import SoundEditor from './SoundEditor.vue'
import type { Sound } from '@/models/sound'

const props = defineProps<{
  sprite: Sprite
  animation: Animation
  sounds: Sound[]
}>()

const soundName = computed(() => props.sounds.find((s) => s.id === props.animation.sound)?.name)

type Setting = 'duration' | 'bound-state' | 'sound'

const activeSetting = ref<Setting | null>(null)

function handleSummaryClick(setting: Setting) {
  activeSetting.value = activeSetting.value === setting ? null : setting
}

function handleEditorClose() {
  activeSetting.value = null
}

const boundStateNum = computed(() => props.sprite.getAnimationBoundStates(props.animation.id).length)

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

<style lang="scss" scoped>
.wrapper {
  display: flex;
  justify-content: center;
}

.settings {
  display: flex;
  align-items: center;

  padding: 4px;
  gap: 4px;
  border-radius: var(--ui-border-radius-1);
  box-shadow: var(--ui-box-shadow-small);
  background-color: var(--ui-color-grey-100);
}

.setting {
  display: flex;
  height: 32px;
  padding: 4px 12px;
  align-items: center;
  gap: 4px;

  border-radius: var(--ui-border-radius-1);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ui-color-text-main);
  cursor: pointer;
  transition: 0.2s;

  &.active {
    color: var(--ui-color-primary-main);
    background: var(--ui-color-primary-200);
  }
}

.value {
  padding: 0px 5px;
  border-radius: 8px;
  max-width: 5em;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  font-size: 10px;
  line-height: 1.6;
  color: var(--ui-color-grey-800);
  background-color: var(--ui-color-grey-400);
}
</style>
