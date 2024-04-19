<!-- Common style for sprites & sounds panel -->

<template>
  <div class="common-panel" :class="{ expanded }" :style="cssVars">
    <section v-show="expanded" class="details">
      <PanelHeader :active="active">
        {{ title }}
        <template #add-options>
          <slot name="add-options"></slot>
        </template>
      </PanelHeader>
      <slot name="details"></slot>
    </section>
    <section v-show="!expanded" class="summary" @click="emit('expand')">
      <!-- TODO: use UICardHeader? -->
      <h4 class="summary-header">{{ title }}</h4>
      <slot name="summary"></slot>
    </section>
  </div>
</template>

<script setup lang="ts">
import { getCssVars } from '@/components/ui'
import PanelHeader from '../common/PanelHeader.vue'

// uiVariables.color.(sprite|sound|stage)
export type Color = {
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  main: string
}

const props = defineProps<{
  title: string
  expanded: boolean
  active: boolean
  color: Color
}>()

const emit = defineEmits<{
  expand: []
}>()

const cssVars = getCssVars('--panel-color-', props.color)
</script>

<style scoped lang="scss">
.common-panel {
  transition: 0.3s;
  flex: 0 0 auto;

  &.expanded {
    flex: 1 1 0;
  }
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
