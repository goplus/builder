<script setup lang="ts">
import { computed, nextTick, provide, ref, shallowReactive, toRef, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { UIButton, UIButtonGroup, UIButtonGroupItem, UIIcon, UIModalClose, useConfirmDialog } from '@/components/ui'
import { resourceWorkspaceKey, type ResourceTool as Tool } from './resource-workspace'
import ResourceEditActions from './ResourceEditActions.vue'
import ResourceTool from './ResourceTool.vue'

const props = withDefaults(
  defineProps<{
    enabled?: boolean
    resourceKey?: string | null
    resourceType?: 'costume' | 'animation'
    aiEnabled?: boolean
    pending?: boolean
    busy?: boolean
    selectionLocked?: boolean
    canReview?: boolean
  }>(),
  {
    enabled: true,
    aiEnabled: true,
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
watch(
  () => Array.from(tools.keys()),
  () => {
    if (tools.size === 1) activeTool.value = toolItems.value[0].tool
    else if (activeTool.value != null && !tools.has(activeTool.value)) activeTool.value = null
  }
)
const panel = ref<HTMLElement | null>(null)
const details = ref<HTMLElement | null>(null)
const instruction = ref('')
const selectionLocked = computed(() => (props.aiEnabled && props.pending) || props.busy || props.selectionLocked)
const previewArea = ref<{ left: number; top: number; width: number; height: number } | null>(null)
const previewBottomSpace = computed(() => (props.resourceType === 'animation' ? 244 : 180))
const promptPosition = computed(() => {
  if (!aiActive.value || previewArea.value == null) return undefined
  const area = previewArea.value
  return {
    top: `${area.top + area.height + (props.resourceType === 'animation' ? 88 : 24)}px`,
    bottom: 'auto',
    left: '50%',
    right: 'auto',
    transform: 'translateX(-50%)',
    width: `${Math.max(320, area.width)}px`,
    maxWidth: 'calc(100% - 48px)'
  }
})
const previewTopSpace = computed(() => 64)
const canCloseEditor = computed(() => !props.pending && !props.busy && !props.canReview)
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
  () => {
    selected.value = selectionLocked.value
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
  <div
    v-if="enabled"
    class="relative min-w-0 min-h-0 flex-1 flex bg-grey-200"
    @pointerdown.self="!selectionLocked && (selected = false)"
  >
    <slot></slot>
    <div
      v-show="aiActive && showEditActions"
      v-radar="{ name: 'Resource edit actions', desc: 'Review and apply the current result' }"
      role="toolbar"
      :aria-label="$t({ en: 'Result actions', zh: '结果操作' })"
      class="absolute left-6 right-6 top-2 z-30 flex h-10 items-center justify-between gap-4"
      :style="
        previewArea == null
          ? undefined
          : {
              left: `${previewArea.left}px`,
              top: `${previewArea.top - 48}px`,
              width: `${previewArea.width}px`,
              right: 'auto'
            }
      "
    >
      <div v-radar="{ name: 'Resource result tools', desc: 'Review versions of the current result' }">
        <slot name="actions" :section="'history' as const"><ResourceEditActions section="history" /></slot>
      </div>
      <slot name="actions" :section="'commit' as const">
        <ResourceEditActions section="commit" @discard="discardInstruction" />
      </slot>
    </div>
    <div v-if="canOpenAIEditor && !aiActive" class="absolute inset-x-6 bottom-4 z-30 flex justify-center">
      <UIButton
        v-radar="{
          name: 'ai-edit',
          label: $t({ en: 'AI edit', zh: 'AI 编辑' }),
          desc: 'Edit the current costume with AI'
        }"
        type="white"
        :disabled="busy"
        @click="handleOpenAIEditor"
      >
        <UIIcon type="wandSparkles" />
        {{ $t({ en: 'AI edit...', zh: 'AI 编辑…' }) }}
      </UIButton>
    </div>
    <div
      v-show="!aiEnabled || selected"
      v-radar="{ name: 'Resource tool area', desc: 'Tools for the selected media' }"
      class="absolute inset-x-6 bottom-4 z-30 flex flex-col items-center gap-2 pointer-events-none"
      :style="promptPosition"
    >
      <div ref="panel" class="w-full pointer-events-auto" :class="aiActive ? 'max-w-[640px]' : 'max-w-[440px]'"></div>
      <ResourceTool
        v-if="aiEnabled"
        tool="ai"
        icon="wandSparkles"
        :closable="!pending && !busy"
        :label="$t(pending ? { en: 'AI generate', zh: 'AI 生成' } : { en: 'AI edit', zh: 'AI 编辑' })"
      >
        <form class="relative w-full" :class="{ 'with-close': canCloseEditor }" @submit.prevent>
          <UIModalClose
            v-if="canCloseEditor"
            v-radar="{ name: 'Close resource workspace', desc: 'Close the AI editor' }"
            class="absolute right-2 top-2 z-10"
            role="button"
            :aria-label="$t({ en: 'Close AI editor', zh: '关闭 AI 编辑' })"
            tabindex="0"
            @click="activeTool = null"
            @keydown.enter.prevent="activeTool = null"
            @keydown.space.prevent="activeTool = null"
          />
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
.with-close :deep(.description-input .main) {
  margin-right: 28px;
}
</style>
