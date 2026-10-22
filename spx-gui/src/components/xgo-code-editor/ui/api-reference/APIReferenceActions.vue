<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { untilTaskScheduled } from '@/utils/utils'
import { UIDropdown, UIIcon, UITooltip } from '@/components/ui'
import type { Action } from '../../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import type { InternalAction } from '../code-editor-ui'
import CommandIcon from '../command/CommandIcon.vue'
import ActionButton from '../hover/ActionButton.vue'

const props = defineProps<{
  actions: Action[]
  compact?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: []
  menuVisibleChange: [visible: boolean]
  dismiss: []
}>()

const { ui } = useCodeEditorUICtx()
const actions = computed(() =>
  props.actions.map((action) => ui.resolveAction(action)).filter((action) => action != null)
)
const primaryAction = computed(() => actions.value[0] ?? null)
const moreActions = computed(() => actions.value.slice(1))
const menuVisible = ref(false)
const menuRef = ref<HTMLElement>()
const moreButtonRef = ref<HTMLButtonElement>()

async function setMenuVisible(visible: boolean) {
  const hadFocus = menuRef.value?.contains(document.activeElement)
  menuVisible.value = visible
  emit('menuVisibleChange', visible)
  if (!visible) {
    if (hadFocus) moreButtonRef.value?.focus()
    return
  }
  await nextTick()
  await untilTaskScheduled('user-visible')
  if (menuVisible.value) menuRef.value?.querySelector<HTMLButtonElement>('button')?.focus()
}

function moveMenuFocus(event: KeyboardEvent, direction: number) {
  const buttons = Array.from(menuRef.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
  const index = buttons.indexOf(event.target as HTMLButtonElement)
  buttons[(index + direction + buttons.length) % buttons.length]?.focus()
}

watch(
  () => props.disabled || moreActions.value.length === 0,
  (unavailable) => {
    if (unavailable && menuVisible.value) void setMenuVisible(false)
  }
)

const handleAction = useMessageHandle(
  async (action: InternalAction) => {
    if (props.disabled) return
    await setMenuVisible(false)
    await ui.executeCommand(action.command, ...action.arguments)
    emit('action')
  },
  { en: 'Failed to execute command', zh: '执行命令失败' }
).fn
</script>

<template>
  <div
    v-if="primaryAction != null"
    class="flex shrink-0 items-center gap-1"
    :data-menu-open="menuVisible"
    draggable="true"
    @dragstart.stop.prevent
    @mousedown.stop
    @mouseup.stop
    @click.stop
  >
    <UITooltip v-if="compact">
      <template #trigger>
        <button
          v-radar="{ name: primaryAction.title, desc: 'Run this API action' }"
          type="button"
          class="size-6 cursor-pointer flex items-center justify-center rounded-sm border-0 bg-transparent p-0 text-primary-main transition-colors enabled:hover:text-primary-400 enabled:active:text-primary-600 disabled:cursor-not-allowed disabled:text-disabled-text"
          :disabled="disabled"
          @click="handleAction(primaryAction)"
        >
          <CommandIcon :type="primaryAction.commandInfo.icon" aria-hidden="true" />
        </button>
      </template>
      {{ primaryAction.title }}
    </UITooltip>
    <ActionButton
      v-else
      v-radar="{ name: primaryAction.title, desc: 'Run this API action' }"
      :icon="primaryAction.commandInfo.icon"
      :disabled="disabled"
      @click="handleAction(primaryAction)"
    >
      {{ primaryAction.title }}
    </ActionButton>
    <UIDropdown
      v-if="moreActions.length > 0"
      :visible="menuVisible"
      trigger="manual"
      placement="bottom-end"
      :disabled="disabled"
      @update:visible="setMenuVisible"
      @click-outside="emit('dismiss')"
    >
      <template #trigger>
        <UITooltip :disabled="menuVisible">
          <template #trigger>
            <button
              ref="moreButtonRef"
              v-radar="{ name: $t({ en: 'More API actions', zh: '更多 API 操作' }), desc: 'Show other API actions' }"
              type="button"
              class="size-6 cursor-pointer flex items-center justify-center rounded-sm border-0 bg-transparent p-0 text-grey-800 enabled:hover:bg-grey-300 enabled:active:bg-grey-400 disabled:cursor-not-allowed disabled:text-disabled-text"
              :disabled="disabled"
              aria-haspopup="menu"
              :aria-expanded="menuVisible"
              @click="setMenuVisible(!menuVisible)"
              @keydown.down.prevent="setMenuVisible(true)"
            >
              <UIIcon class="size-4 [&_svg]:scale-95" type="more" />
            </button>
          </template>
          {{ $t({ en: 'More actions', zh: '更多操作' }) }}
        </UITooltip>
      </template>
      <ul
        ref="menuRef"
        v-radar="{ name: $t({ en: 'API actions', zh: 'API 操作' }), desc: 'Other available API actions' }"
        role="menu"
        class="max-h-75 w-44 overflow-y-auto p-1.5"
        @click.stop
        @mousedown.stop
        @keydown.down.prevent="moveMenuFocus($event, 1)"
        @keydown.up.prevent="moveMenuFocus($event, -1)"
        @keydown.esc.stop.prevent="setMenuVisible(false)"
        @keydown.tab="setMenuVisible(false)"
      >
        <li v-for="(action, i) in moreActions" :key="i" role="none">
          <button
            v-radar="{ name: action.title, desc: 'Run this API action' }"
            type="button"
            role="menuitem"
            tabindex="-1"
            class="w-full cursor-pointer flex items-center gap-2 rounded-sm border-0 bg-transparent px-2 py-2 text-left text-sm text-grey-1000 hover:bg-grey-300 active:bg-grey-400"
            @click="handleAction(action)"
          >
            <CommandIcon class="shrink-0" :type="action.commandInfo.icon" />
            {{ action.title }}
          </button>
        </li>
      </ul>
    </UIDropdown>
  </div>
</template>
