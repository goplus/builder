<script setup lang="ts">
import { computed, onBeforeUnmount, useId, watchEffect } from 'vue'
import { UICard, UICardHeader, UIModalClose } from '@/components/ui'
import type { Type as IconType } from '@/components/ui/icons/UIIcon.vue'
import { useResourceWorkspace } from './resource-workspace'

const props = withDefaults(
  defineProps<{
    tool: string
    label: string
    title?: string | null
    icon: IconType
    closable?: boolean | null
  }>(),
  { title: null, closable: null }
)
const workspace = useResourceWorkspace()
const active = computed(() => workspace?.activeTool.value === props.tool)
const closable = computed(
  () => props.closable ?? (workspace != null && workspace.tools.size > 1 && !workspace.selectionLocked.value)
)
const id = useId()
watchEffect(() => {
  workspace?.tools.set(props.tool, { id, label: props.label, icon: props.icon })
})
onBeforeUnmount(() => {
  workspace?.tools.delete(props.tool)
  if (workspace != null && active.value) workspace.activeTool.value = workspace.tools.has('ai') ? 'ai' : null
})

function close() {
  if (workspace == null || !closable.value) return
  workspace.activeTool.value = null
  document.getElementById(`${id}-tool`)?.focus()
}
</script>

<template>
  <Teleport v-if="workspace?.panel.value != null" :to="workspace.panel.value">
    <UICard
      v-show="active"
      :id="`${id}-panel`"
      :key="workspace.resourceKey.value ?? undefined"
      v-radar="{ name: `Resource tool panel ${tool}`, desc: label }"
      class="resource-tool-panel mx-auto max-w-full"
      :class="tool === 'ai' ? 'w-full rounded-none bg-transparent shadow-none' : 'w-fit'"
      role="tabpanel"
      :aria-labelledby="tool === 'ai' ? undefined : `${id}-title`"
    >
      <UICardHeader v-if="tool !== 'ai'">
        <h4 :id="`${id}-title`" class="min-w-0 flex-1 truncate">{{ title ?? label }}</h4>
        <UIModalClose
          v-if="closable"
          v-radar="{ name: 'Close resource workspace', desc: 'Close the current tool panel' }"
          role="button"
          tabindex="0"
          @click="close"
          @keydown.enter.prevent="close"
          @keydown.space.prevent="close"
        />
      </UICardHeader>
      <div class="max-h-[min(360px,50vh)] overflow-auto">
        <slot :active="active" :close="close"></slot>
      </div>
    </UICard>
  </Teleport>
  <Teleport v-if="active && workspace?.details.value != null && $slots.details != null" :to="workspace.details.value">
    <slot name="details"></slot>
  </Teleport>
  <template v-if="workspace == null">
    <slot :active="active" :close="close"></slot>
    <slot name="details"></slot>
  </template>
</template>

<style scoped>
.resource-tool-panel :deep(.description-input) {
  height: 140px;
  min-height: 140px;
  padding: 12px;
  gap: 8px;
}

.resource-tool-panel :deep(.description-input .main) {
  min-height: 0;
  padding: 0;
}

.resource-tool-panel :deep(.description-input .footer) {
  flex: none;
  padding: 0;
}

.resource-tool-panel :deep(.description-input .extra) {
  min-width: 0;
  padding: 0;
}
</style>
