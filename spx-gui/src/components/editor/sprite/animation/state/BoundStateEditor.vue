<!-- eslint-disable vue/no-v-html -->

<template>
  <UIDropdownModal
    v-radar="{ name: 'Bound state editor modal', desc: 'Modal for editing animation bound state' }"
    :title="$t(actionName)"
    style="width: 320px"
    @cancel="emit('close')"
    @confirm="handleConfirm"
  >
    <ul class="flex-[1_1_0] flex flex-wrap content-start gap-3">
      <UIBlockItem
        v-radar="{ name: 'State default', desc: 'Click to select state \u0022default\u0022' }"
        :active="isBound(State.Default)"
        @click="handleStateItemClick(State.Default)"
      >
        <div class="mt-1 h-14 w-14" v-html="iconStateDefault"></div>
        <p
          class="mt-0.5 w-full overflow-hidden px-2 py-0.75 text-center text-10/[1.6] whitespace-nowrap text-ellipsis text-title"
        >
          {{ $t({ en: 'Default', zh: '默认' }) }}
        </p>
        <UICornerIcon v-show="isBound(State.Default)" type="check" />
      </UIBlockItem>
      <UIBlockItem
        v-radar="{ name: 'State step', desc: 'Click to select state \u0022step\u0022' }"
        :active="isBound(State.Step)"
        @click="handleStateItemClick(State.Step)"
      >
        <div class="mt-1 h-14 w-14" v-html="iconStateStep"></div>
        <p
          class="mt-0.5 w-full overflow-hidden px-2 py-0.75 text-center text-10/[1.6] whitespace-nowrap text-ellipsis text-title"
        >
          {{ $t({ en: 'Step', zh: '行走' }) }}
        </p>
        <UICornerIcon v-show="isBound(State.Step)" type="check" />
      </UIBlockItem>
      <UIBlockItem
        v-radar="{ name: 'State die', desc: 'Click to select state \u0022die\u0022' }"
        :active="isBound(State.Die)"
        @click="handleStateItemClick(State.Die)"
      >
        <div class="mt-1 h-14 w-14" v-html="iconStateDie"></div>
        <p
          class="mt-0.5 w-full overflow-hidden px-2 py-0.75 text-center text-10/[1.6] whitespace-nowrap text-ellipsis text-title"
        >
          {{ $t({ en: 'Die', zh: '死亡' }) }}
        </p>
        <UICornerIcon v-show="isBound(State.Die)" type="check" />
      </UIBlockItem>
    </ul>
  </UIDropdownModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Animation } from '@/models/spx/animation'
import { State } from '@/models/spx/sprite'
import { UIDropdownModal, UICornerIcon, UIBlockItem } from '@/components/ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import iconStateDefault from './default.svg?raw'
import iconStateStep from './step.svg?raw'
import iconStateDie from './die.svg?raw'

const props = defineProps<{
  animation: Animation
}>()

const emit = defineEmits<{
  close: []
}>()

const editorCtx = useEditorCtx()
const actionName = { en: 'Bind state', zh: '绑定状态' }
const boundStates = ref(props.animation.sprite?.getAnimationBoundStates(props.animation.id) ?? [])

function isBound(state: State) {
  return boundStates.value.includes(state)
}

function handleStateItemClick(state: State) {
  boundStates.value = boundStates.value.includes(state)
    ? boundStates.value.filter((s) => s !== state)
    : [...boundStates.value, state]
}

async function handleConfirm() {
  await editorCtx.state.history.doAction({ name: actionName }, () => {
    const sprite = props.animation.sprite
    if (sprite == null) throw new Error('Animation has no associated sprite')
    sprite.setAnimationBoundStates(props.animation.id, boundStates.value)
  })
  emit('close')
}
</script>
