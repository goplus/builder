<script lang="ts" setup>
import { UIDropdown, UIIcon, UIMenu, UIMenuItem } from '@/components/ui'
import ConfigPanel from '../ConfigPanel.vue'
import type { Widget } from '@/models/widget'
import type { Project } from '@/models/project'

const props = defineProps<{
  widget: Widget
  project: Project
}>()

const moveActionNames = {
  up: { en: 'Bring forward', zh: '向前移动' },
  top: { en: 'Bring to front', zh: '移到最前' },
  down: { en: 'Send backward', zh: '向后移动' },
  bottom: { en: 'Send to back', zh: '移到最后' }
}

async function moveZorder(direction: 'up' | 'down' | 'top' | 'bottom') {
  await props.project.history.doAction({ name: moveActionNames[direction] }, () => {
    const { widget, project } = props
    if (direction === 'up') {
      project.stage.upWidgetZorder(widget.id)
    } else if (direction === 'down') {
      project.stage.downWidgetZorder(widget.id)
    } else if (direction === 'top') {
      project.stage.topWidgetZorder(widget.id)
    } else if (direction === 'bottom') {
      project.stage.bottomWidgetZorder(widget.id)
    }
  })
}
</script>

<!-- eslint-disable vue/no-v-html -->
<template>
  <ConfigPanel>
    <UIDropdown trigger="click" placement="top">
      <template #trigger>
        <div class="config-item">
          <UIIcon class="icon" type="layer" />
        </div>
      </template>
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Move up', desc: 'Click to move widget up in z-order' }"
          @click="moveZorder('up')"
          >{{ $t(moveActionNames.up) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Move to top', desc: 'Click to move widget to top in z-order' }"
          @click="moveZorder('top')"
          >{{ $t(moveActionNames.top) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Move down', desc: 'Click to move widget down in z-order' }"
          @click="moveZorder('down')"
          >{{ $t(moveActionNames.down) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Move to bottom', desc: 'Click to move widget to bottom in z-order' }"
          @click="moveZorder('bottom')"
          >{{ $t(moveActionNames.bottom) }}</UIMenuItem
        >
      </UIMenu>
    </UIDropdown>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.config-item {
  width: 32px;
  height: 32px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;

  &:hover,
  &.active {
    background: var(--ui-color-turquoise-200);

    .icon {
      color: var(--ui-color-turquoise-500);
    }
  }
}
</style>
