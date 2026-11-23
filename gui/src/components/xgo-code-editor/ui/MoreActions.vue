<script setup lang="ts">
import { UIDropdownWithTooltip, UIIcon, UIMenu, UIMenuGroup, UIMenuItem } from '@/components/ui'
import type { InternalAction } from './code-editor-ui'
import CommandIcon from './command/CommandIcon.vue'

defineProps<{
  actions: InternalAction[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [action: InternalAction]
}>()
</script>

<template>
  <UIDropdownWithTooltip v-if="actions.length > 0" placement="bottom-end" :disabled="disabled">
    <template #trigger="{ dropdownVisible }">
      <button
        v-radar="{
          name: 'more-actions',
          label: $t({ en: 'More actions', zh: '更多操作' }),
          desc: 'Show other actions'
        }"
        type="button"
        class="size-6 cursor-pointer flex items-center justify-center rounded-sm border-0 bg-transparent p-0 text-grey-800 enabled:hover:bg-grey-300 enabled:active:bg-grey-400 disabled:cursor-not-allowed disabled:text-disabled-text"
        :disabled="disabled"
        :aria-expanded="dropdownVisible"
      >
        <UIIcon class="size-4 [&_svg]:scale-95" type="more" />
      </button>
    </template>
    <template #tooltip-content>{{ $t({ en: 'More actions', zh: '更多操作' }) }}</template>
    <template #dropdown-content>
      <UIMenu
        v-radar="{
          name: 'action-menu',
          label: $t({ en: 'Actions', zh: '操作' }),
          desc: 'Other available actions'
        }"
        class="max-h-75 w-44 overflow-y-auto"
        @click.stop
        @mousedown.stop
      >
        <UIMenuGroup :disabled="disabled">
          <UIMenuItem
            v-for="(action, i) in actions"
            :key="i"
            v-radar="{ name: 'action', label: $t(action.title), desc: 'Run this action' }"
            @click="emit('select', action)"
          >
            <template #icon><CommandIcon :type="action.commandInfo.icon" /></template>
            {{ $t(action.title) }}
          </UIMenuItem>
        </UIMenuGroup>
      </UIMenu>
    </template>
  </UIDropdownWithTooltip>
</template>
