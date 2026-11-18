<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { untilTaskScheduled } from '@/utils/utils'
import { UIDropdown, UIIcon, UITooltip } from '@/components/ui'
import type { InternalAction } from './code-editor-ui'
import CommandIcon from './command/CommandIcon.vue'

const props = defineProps<{
  actions: InternalAction[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [action: InternalAction]
  visibleChange: [visible: boolean]
  dismiss: []
}>()

const menuVisible = ref(false)
const menuRef = ref<HTMLElement>()
const moreButtonRef = ref<HTMLButtonElement>()

async function setMenuVisible(visible: boolean) {
  if (menuVisible.value === visible) return
  const hadFocus = menuRef.value?.contains(document.activeElement)
  menuVisible.value = visible
  emit('visibleChange', visible)
  if (!visible) {
    if (hadFocus) moreButtonRef.value?.focus()
    return
  }
  await nextTick()
  await untilTaskScheduled('user-visible')
  if (menuVisible.value) menuRef.value?.querySelector<HTMLButtonElement>('button')?.focus()
}

function closeOnTab() {
  moreButtonRef.value?.focus()
  void setMenuVisible(false)
}

function moveMenuFocus(event: KeyboardEvent, direction: number) {
  const buttons = Array.from(menuRef.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
  const index = buttons.indexOf(event.target as HTMLButtonElement)
  buttons[(index + direction + buttons.length) % buttons.length]?.focus()
}

watch([() => props.disabled, () => props.actions.length], () => void setMenuVisible(false))

function handleAction(action: InternalAction) {
  if (props.disabled) return
  void setMenuVisible(false)
  emit('select', action)
}
</script>

<template>
  <UIDropdown
    v-if="actions.length > 0"
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
            v-radar="{
              name: 'more-actions',
              label: $t({ en: 'More actions', zh: '更多操作' }),
              desc: 'Show other actions'
            }"
            type="button"
            class="size-6 cursor-pointer flex items-center justify-center rounded-sm border-0 bg-transparent p-0 text-grey-800 enabled:hover:bg-grey-300 enabled:active:bg-grey-400 disabled:cursor-not-allowed disabled:text-disabled-text"
            :disabled="disabled"
            :aria-label="$t({ en: 'More actions', zh: '更多操作' })"
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
      v-radar="{
        name: 'action-menu',
        label: $t({ en: 'Actions', zh: '操作' }),
        desc: 'Other available actions'
      }"
      role="menu"
      class="max-h-75 w-44 overflow-y-auto p-1.5"
      @click.stop
      @mousedown.stop
      @keydown.down.prevent="moveMenuFocus($event, 1)"
      @keydown.up.prevent="moveMenuFocus($event, -1)"
      @keydown.esc.stop.prevent="setMenuVisible(false)"
      @keydown.tab="closeOnTab"
    >
      <li v-for="(action, i) in actions" :key="i" role="none">
        <button
          v-radar="{ name: 'action', label: action.title, desc: 'Run this action' }"
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
</template>
