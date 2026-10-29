<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useContentSize } from '@/utils/dom'
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
const inlineCount = ref(1)
const inlineActions = computed(() => actions.value.slice(0, props.compact ? 1 : inlineCount.value))
const moreActions = computed(() => actions.value.slice(inlineActions.value.length))
const actionsRef = ref<HTMLElement | null>(null)
const measurementRef = ref<HTMLElement | null>(null)
const actionsSize = useContentSize(computed(() => (props.compact ? null : actionsRef.value)))
const measurementSize = useContentSize(measurementRef)

watch(
  [actions, () => props.compact, actionsSize, measurementSize],
  () => {
    const measurement = measurementRef.value
    const availableWidth = actionsSize.value?.width
    if (props.compact || measurement == null || availableWidth == null) return
    const widths = Array.from(measurement.querySelectorAll('button'), (button) => button.offsetWidth)
    const gap = parseFloat(getComputedStyle(measurement).columnGap) || 0
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1)
    if (totalWidth <= availableWidth) {
      inlineCount.value = widths.length
      return
    }
    let usedWidth = (measurement.lastElementChild as HTMLElement).offsetWidth
    let count = 0
    for (const width of widths) {
      usedWidth += gap + width
      if (usedWidth > availableWidth) break
      count++
    }
    inlineCount.value = count
  },
  { flush: 'post' }
)

const menuVisible = ref(false)
const menuRef = ref<HTMLElement>()
const moreButtonRef = ref<HTMLButtonElement>()

async function setMenuVisible(visible: boolean) {
  const hadFocus = menuRef.value?.contains(document.activeElement)
  menuVisible.value = visible
  emit('menuVisibleChange', visible)
  if (!visible) {
    if (hadFocus) {
      if (moreActions.value.length === 0) await nextTick()
      const target = moreButtonRef.value ?? actionsRef.value?.querySelector<HTMLButtonElement>('[data-inline-action]')
      target?.focus()
    }
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

watch([() => props.disabled, () => moreActions.value.length], async ([disabled, count], [, previousCount]) => {
  if (menuVisible.value && (disabled || count !== previousCount)) {
    await setMenuVisible(false)
    return
  }
  if (disabled || count === previousCount) return
  const active = document.activeElement
  const buttons = Array.from(actionsRef.value?.querySelectorAll<HTMLButtonElement>('[data-inline-action]') ?? [])
  const index = buttons.indexOf(active as HTMLButtonElement)
  if (active !== moreButtonRef.value && (index < 0 || index < inlineActions.value.length)) return
  await nextTick()
  if (active?.isConnected || document.activeElement !== document.body) return
  const target = moreButtonRef.value ?? actionsRef.value?.querySelector<HTMLButtonElement>('[data-inline-action]')
  target?.focus()
})

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
    ref="actionsRef"
    class="relative flex min-w-0 items-center gap-1"
    :class="compact ? 'shrink-0' : 'w-0 flex-1'"
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
    <template v-else>
      <ActionButton
        v-for="(action, i) in inlineActions"
        :key="i"
        v-radar="{ name: action.title, desc: 'Run this API action' }"
        data-inline-action
        class="shrink-0 whitespace-nowrap"
        :icon="action.commandInfo.icon"
        :disabled="disabled"
        @click="handleAction(action)"
      >
        {{ action.title }}
      </ActionButton>
    </template>
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
    <div
      v-if="!compact"
      ref="measurementRef"
      aria-hidden="true"
      class="pointer-events-none invisible absolute flex items-center gap-1 whitespace-nowrap"
    >
      <ActionButton
        v-for="(action, i) in actions"
        :key="i"
        class="shrink-0"
        :icon="action.commandInfo.icon"
        disabled
        tabindex="-1"
      >
        {{ action.title }}
      </ActionButton>
      <span class="size-6 shrink-0"></span>
    </div>
  </div>
</template>
