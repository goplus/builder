<script lang="ts" setup>
import ConfigPanel from '../common/ConfigPanel.vue'
import type { Widget } from '@/models/widget'
import type { Project } from '@/models/project'
import ZOrderConfigItem, { moveActionNames } from '../common/ZOrderConfigItem.vue'

const props = defineProps<{
  widget: Widget
  project: Project
}>()

async function moveZorder(direction: keyof typeof moveActionNames) {
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

<template>
  <ConfigPanel>
    <ZOrderConfigItem type="widget" @move-zorder="moveZorder" />
  </ConfigPanel>
</template>

<style lang="scss" scoped></style>
