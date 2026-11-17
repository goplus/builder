<script setup lang="ts">
import { computed, nextTick, provide, ref, shallowReactive, toRef, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { getCleanupSignal } from '@/utils/disposable'
import { useContentSize } from '@/utils/dom'
import { UIButton, UIButtonGroup, UIButtonGroupItem, UIIcon, useConfirmDialog } from '@/components/ui'
import { resourceWorkspaceKey, type ResourceTool as Tool } from './resource-workspace'
import ResourceEditActions from './ResourceEditActions.vue'
import ResourceTool from './ResourceTool.vue'

const props = withDefaults(
  defineProps<{
    enabled?: boolean
    resourceKey?: string | null
    resourceType?: 'costume' | 'animation'
    aiEnabled?: boolean
    initiallyOpen?: boolean
    pending?: boolean
    busy?: boolean
    selectionLocked?: boolean
    canReview?: boolean
  }>(),
  {
    enabled: true,
    aiEnabled: true,
    initiallyOpen: false,
    pending: false,
    busy: false,
    selectionLocked: false,
    canReview: false,
    resourceKey: null,
    resourceType: 'costume'
  }
)
const activeTool = defineModel<string | null>('activeTool', { default: 'ai' })
const selected = ref(true)
const aiActive = computed(() => props.aiEnabled && selected.value && activeTool.value === 'ai')
const canOpenAIEditor = computed(() => props.aiEnabled && !props.pending && props.resourceType === 'costume')
const showEditActions = computed(() => selected.value && activeTool.value === 'ai' && props.canReview)
const tools = shallowReactive(new Map<string, Tool>())
const toolItems = computed(() => {
  const entries = Array.from(tools, ([tool, item]) => ({ tool, ...item }))
  return [...entries.filter((item) => item.tool === 'ai'), ...entries.filter((item) => item.tool !== 'ai')]
})
const collapsibleEditor = computed(() => canOpenAIEditor.value && tools.size === 1)
const editEntry = ref<InstanceType<typeof UIButton> | null>(null)
const editorShell = ref<HTMLElement | null>(null)
watch(
  () => Array.from(tools.keys()),
  () => {
    if (tools.size === 1) activeTool.value = toolItems.value[0].tool
    else if (activeTool.value != null && !tools.has(activeTool.value)) activeTool.value = null
  }
)
const panel = ref<HTMLElement | null>(null)
const submitTarget = ref<HTMLElement | null>(null)
const submitSize = useContentSize(submitTarget)
const details = ref<HTMLElement | null>(null)
const instruction = ref('')
const selectionLocked = computed(() => (props.aiEnabled && props.pending) || props.busy || props.selectionLocked)
const previewArea = ref<{ left: number; top: number; width: number; height: number } | null>(null)
const previewBottomSpace = computed(() =>
  props.resourceType === 'animation' ? 244 : collapsibleEditor.value ? 196 : 180
)
const previewTopSpace = computed(() => 64)
const canCollapseEditor = computed(
  () => props.enabled && collapsibleEditor.value && aiActive.value && !selectionLocked.value && !props.canReview
)
watch([editorShell, canCollapseEditor], ([element, canCollapse], _, onCleanup) => {
  if (element == null || !canCollapse) return
  const handleOutside = (event: Event) => {
    if (event.target instanceof Node && !element.contains(event.target)) selected.value = false
  }
  const signal = getCleanupSignal(onCleanup)
  document.addEventListener('pointerdown', handleOutside, { capture: true, signal })
  document.addEventListener('focusin', handleOutside, { capture: true, signal })
})
const { t } = useI18n()
const confirm = useConfirmDialog()
const discardInstruction = useMessageHandle(async () => {
  if (instruction.value.trim() === '') return
  await confirm({
    type: 'warning',
    title: t({ en: 'Discard changes?', zh: '放弃修改？' }),
    content: t({ en: 'Your edit instructions will be cleared.', zh: '当前输入的修改要求将被清除。' }),
    cancelText: t({ en: 'Cancel', zh: '取消' }),
    confirmText: t({ en: 'Discard', zh: '放弃' })
  })
  instruction.value = ''
}).fn
provide(
  resourceWorkspaceKey,
  props.enabled
    ? {
        activeTool,
        selected,
        busy: toRef(props, 'busy'),
        aiActive,
        canReview: toRef(props, 'canReview'),
        previewTopSpace,
        previewArea,
        selectionLocked,
        resourceKey: toRef(props, 'resourceKey'),
        tools,
        panel,
        submitTarget,
        details,
        instruction,
        previewBottomSpace
      }
    : null
)
watch(selectionLocked, (locked) => {
  if (locked) selected.value = true
})
watch(
  () => [props.resourceKey, props.aiEnabled],
  (_, previous) => {
    selected.value = selectionLocked.value || (previous == null && props.initiallyOpen)
    activeTool.value = props.aiEnabled ? 'ai' : null
    instruction.value = ''
  },
  { immediate: true }
)

function openAIEditor() {
  selected.value = true
  activeTool.value = 'ai'
}

async function handleOpenAIEditor() {
  openAIEditor()
  await nextTick()
  panel.value?.querySelector<HTMLElement>('textarea, input, [contenteditable="true"]')?.focus({ preventScroll: true })
}
watch(
  aiActive,
  (active, wasActive) => {
    if (!active && wasActive && selected.value && collapsibleEditor.value) editEntry.value?.focus()
  },
  { flush: 'post' }
)
defineExpose({ openAIEditor })

function handleToolKeydown(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const tabs = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[data-resource-tool]'))
  const index = tabs.indexOf(event.target as HTMLElement)
  if (index < 0) return
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  event.preventDefault()
  tabs[next].focus()
}
</script>

<template>
  <div v-if="enabled" class="relative min-w-0 min-h-0 flex-1 flex bg-grey-200">
    <slot></slot>
    <div
      v-show="aiActive && showEditActions"
      v-radar="{ name: 'Resource edit actions', desc: 'Review and apply the current result' }"
      role="toolbar"
      :aria-label="$t({ en: 'Result actions', zh: '结果操作' })"
      class="absolute left-6 right-6 top-2 z-30 flex h-10 items-center justify-between gap-4"
    >
      <div v-radar="{ name: 'Resource result tools', desc: 'Review versions of the current result' }">
        <slot name="actions" :section="'history' as const"><ResourceEditActions section="history" /></slot>
      </div>
      <slot name="actions" :section="'commit' as const">
        <ResourceEditActions section="commit" @discard="discardInstruction" />
      </slot>
    </div>
    <div
      v-show="collapsibleEditor || !aiEnabled || selected"
      v-radar="{ name: 'Resource tool area', desc: 'Tools for the selected media' }"
      class="absolute inset-x-6 bottom-4 z-30 flex flex-col items-center gap-2 pointer-events-none"
    >
      <div
        ref="editorShell"
        class="w-full pointer-events-auto"
        :style="{ '--edit-submit-width': `${submitSize?.width ?? 96}px` }"
        :class="[
          collapsibleEditor && !aiActive ? 'max-w-[480px]' : aiActive ? 'max-w-[640px]' : 'max-w-[440px]',
          { 'resource-editor t-resize': collapsibleEditor, 'is-expanded': aiActive }
        ]"
      >
        <div
          v-if="collapsibleEditor"
          class="resource-editor-entry absolute inset-x-0 top-0 flex h-[54px] w-full items-center pl-4"
          :style="{ visibility: aiActive ? 'hidden' : 'visible' }"
          :inert="aiActive"
          :aria-hidden="aiActive"
          @click.self="handleOpenAIEditor"
        >
          <UIButton
            ref="editEntry"
            v-radar="{
              name: 'ai-edit',
              label: $t({ en: 'Describe changes to this costume', zh: '描述对当前造型的修改' }),
              desc: 'Expand the AI editor for this costume'
            }"
            type="white"
            class="h-full min-w-0 flex-1 cursor-text justify-start rounded-none border-none p-0 text-hint-2 enabled:hover:bg-transparent enabled:active:bg-transparent"
            :aria-expanded="aiActive"
            :aria-controls="`${tools.get('ai')?.id}-panel`"
            :disabled="busy"
            @click="handleOpenAIEditor"
          >
            <span class="truncate">{{
              $t({ en: 'Describe changes to this costume', zh: '描述对当前造型的修改' })
            }}</span>
          </UIButton>
        </div>
        <div
          ref="panel"
          class="w-full"
          :class="{ 'resource-editor-panel': collapsibleEditor }"
          :style="collapsibleEditor ? { visibility: aiActive ? 'visible' : 'hidden' } : undefined"
          :inert="collapsibleEditor && !aiActive"
          :aria-hidden="collapsibleEditor && !aiActive ? true : undefined"
        ></div>
        <div v-if="collapsibleEditor" ref="submitTarget" class="absolute bottom-3 right-4 z-10"></div>
      </div>
      <ResourceTool
        v-if="aiEnabled"
        tool="ai"
        icon="wandSparkles"
        :closable="!pending && !busy"
        :visible="collapsibleEditor ? true : null"
        :label="$t(pending ? { en: 'AI generate', zh: 'AI 生成' } : { en: 'AI edit', zh: 'AI 编辑' })"
      >
        <form class="relative w-full" @submit.prevent>
          <slot name="prompt"></slot>
        </form>
        <template v-if="$slots.details != null" #details><slot name="details"></slot></template>
      </ResourceTool>
      <UIButtonGroup
        v-if="toolItems.length > 1"
        v-radar="{ name: 'Resource tools', desc: 'Switch tools for the selected costume or animation' }"
        :value="activeTool ?? undefined"
        type="text"
        class="grid h-10 max-w-full auto-cols-fr grid-flow-col gap-1 bg-grey-100 p-1 shadow-sm pointer-events-auto"
        role="tablist"
        @update:value="activeTool = $event"
        @keydown="handleToolKeydown"
      >
        <UIButtonGroupItem
          v-for="item in toolItems"
          :id="`${item.id}-tool`"
          :key="item.tool"
          v-radar="{ name: `Resource tool ${item.tool}`, desc: item.label }"
          :value="item.tool"
          :data-resource-tool="item.tool"
          class="h-8 min-w-0 gap-1.5 rounded-sm whitespace-nowrap text-sm"
          :class="activeTool !== item.tool ? 'bg-grey-100 text-text' : null"
          role="tab"
          :aria-pressed="null"
          :aria-selected="activeTool === item.tool"
          :aria-controls="`${item.id}-panel`"
          :tabindex="activeTool === item.tool || (activeTool == null && item.tool === toolItems[0]?.tool) ? 0 : -1"
        >
          <UIIcon :type="item.icon" />
          {{ item.label }}
        </UIButtonGroupItem>
      </UIButtonGroup>
    </div>
  </div>
  <slot v-else></slot>
</template>

<style scoped>
.resource-editor {
  --resize-dur: 300ms;
  --resize-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  height: 56px;
  overflow: hidden;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: var(--ui-border-radius-lg);
  background: var(--ui-color-grey-100);
}

.resource-editor.is-expanded {
  height: 140px;
  border-radius: var(--ui-border-radius-md);
}

.resource-editor:focus-within {
  border-color: var(--ui-color-primary-500);
}

.t-resize {
  transition:
    max-width var(--resize-dur) var(--resize-ease),
    height var(--resize-dur) var(--resize-ease),
    border-radius 150ms var(--resize-ease);
  will-change: max-width, height;
}

.resource-editor-entry,
.resource-editor-panel {
  transition:
    opacity 150ms ease-out,
    visibility 150ms;
}

.resource-editor-panel,
.is-expanded > .resource-editor-entry {
  opacity: 0;
}

.is-expanded > .resource-editor-panel {
  opacity: 1;
}

.resource-editor:not(.is-expanded) > .resource-editor-entry,
.is-expanded > .resource-editor-panel {
  transition-duration: 150ms, 0s;
}

.resource-editor-panel :deep(.description-input) {
  height: 138px;
  min-height: 138px;
  border: none;
  border-radius: 0;
  padding: 16px 16px 12px;
}

.resource-editor-panel :deep(.description-input .footer) {
  padding-right: calc(var(--edit-submit-width) + 12px);
}

.resource-editor-entry {
  padding-right: calc(var(--edit-submit-width) + 28px);
}

@media (prefers-reduced-motion: reduce) {
  .t-resize {
    transition: none !important;
  }

  .resource-editor-entry,
  .resource-editor-panel {
    transition: none;
  }
}
</style>
