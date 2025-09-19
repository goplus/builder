<!-- eslint-disable vue/no-v-html -->

<template>
  <UIDropdownModal
    v-radar="{ name: 'Bound state editor modal', desc: 'Modal for editing animation bound state' }"
    :title="$t(actionName)"
    style="width: 320px"
    @cancel="emit('close')"
    @confirm="handleConfirm"
  >
    <ul class="state-items">
      <UIBlockItem
        v-radar="{ name: 'State default', desc: 'Click to select state \u0022default\u0022' }"
        class="state-item"
        :active="isBound(State.Default)"
        @click="handleStateItemClick(State.Default)"
      >
        <div class="icon" v-html="iconStateDefault"></div>
        <p class="name">{{ $t({ en: 'Default', zh: '默认' }) }}</p>
        <UICornerIcon v-show="isBound(State.Default)" type="check" />
      </UIBlockItem>
      <UIBlockItem
        v-radar="{ name: 'State step', desc: 'Click to select state \u0022step\u0022' }"
        class="state-item"
        :active="isBound(State.Step)"
        @click="handleStateItemClick(State.Step)"
      >
        <div class="icon" v-html="iconStateStep"></div>
        <p class="name">{{ $t({ en: 'Step', zh: '行走' }) }}</p>
        <UICornerIcon v-show="isBound(State.Step)" type="check" />
      </UIBlockItem>
      <UIBlockItem
        v-radar="{ name: 'State die', desc: 'Click to select state \u0022die\u0022' }"
        class="state-item"
        :active="isBound(State.Die)"
        @click="handleStateItemClick(State.Die)"
      >
        <div class="icon" v-html="iconStateDie"></div>
        <p class="name">{{ $t({ en: 'Die', zh: '死亡' }) }}</p>
        <UICornerIcon v-show="isBound(State.Die)" type="check" />
      </UIBlockItem>
    </ul>
  </UIDropdownModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Animation } from '@/models/animation'
import { type Sprite, State } from '@/models/sprite'
import { UIDropdownModal, UICornerIcon, UIBlockItem } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import iconStateDefault from './default.svg?raw'
import iconStateStep from './step.svg?raw'
import iconStateDie from './die.svg?raw'

const props = defineProps<{
  animation: Animation
  sprite: Sprite
}>()

const emit = defineEmits<{
  close: []
}>()

const editorCtx = useEditorCtx()
const actionName = { en: 'Bind state', zh: '绑定状态' }
const boundStates = ref(props.sprite.getAnimationBoundStates(props.animation.id))

function isBound(state: State) {
  return boundStates.value.includes(state)
}

function handleStateItemClick(state: State) {
  boundStates.value = boundStates.value.includes(state)
    ? boundStates.value.filter((s) => s !== state)
    : [...boundStates.value, state]
}

async function handleConfirm() {
  await editorCtx.project.history.doAction({ name: actionName }, () => {
    props.sprite.setAnimationBoundStates(props.animation.id, boundStates.value)
  })
  emit('close')
}
</script>

<style lang="scss" scoped>
.state-items {
  flex: 1 1 0;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 12px;
}

.icon {
  margin-top: 4px;
  width: 56px;
  height: 56px;
}

.name {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.6;
  padding: 3px 8px 3px;

  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-align: center;
  text-overflow: ellipsis;
  color: var(--ui-color-title);
}
</style>
