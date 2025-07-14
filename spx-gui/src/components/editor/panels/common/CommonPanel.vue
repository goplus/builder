<!-- Common style for sprites & sounds panel -->

<template>
  <div class="common-panel" :class="{ expanded }" :style="cssVars">
    <section
      v-show="expanded"
      v-radar="{ name: 'Detail', desc: 'Detailed view of the panel', visible: expanded }"
      class="details"
    >
      <PanelHeader :active="active">
        {{ title }}
        <template #add-options>
          <slot name="add-options"></slot>
        </template>
      </PanelHeader>
      <slot name="details"></slot>
    </section>
    <section
      v-show="!expanded"
      v-radar="{ name: 'Summary', desc: 'Summary view of the panel, click to view details', visible: !expanded }"
      class="summary"
      @click="emit('expand')"
    >
      <!-- TODO: use UICardHeader? -->
      <h4 class="summary-header">{{ title }}</h4>
      <slot name="summary"></slot>
    </section>
  </div>
</template>

<script lang="ts">
export const panelColorKey: InjectionKey<Color> = Symbol('color')
export function usePanelColor() {
  const color = inject(panelColorKey)
  if (color == null) throw new Error('usePanelColor should be called inside of CommonPanel')
  return color
}
</script>

<script setup lang="ts">
import { computed, inject, provide, type InjectionKey } from 'vue'
import { getCssVars, useUIVariables, type Color } from '@/components/ui'
import PanelHeader from '../common/PanelHeader.vue'

const props = defineProps<{
  title: string
  expanded: boolean
  active: boolean
  color: Color
}>()

const emit = defineEmits<{
  expand: []
}>()

const uiVariables = useUIVariables()
const cssVars = computed(() => getCssVars('--panel-color-', uiVariables.color[props.color]))
provide(panelColorKey, props.color)
</script>

<style scoped lang="scss">
.common-panel {
  transition: 0.3s;
  flex: 0 0 auto;
  overflow: hidden;

  &.expanded {
    flex: 1 1 0;
  }

  position: relative;
}

.common-panel + .common-panel {
  border-left: 1px solid var(--ui-color-grey-300);
}

.details {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.summary {
  height: 100%;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.summary-header {
  height: 44px;
  width: 80px;
  display: flex;
  justify-content: center;
  align-items: center;

  font-size: 16px;
  color: var(--ui-color-title);
  border-bottom: 1px solid var(--ui-color-grey-400);
}
</style>
