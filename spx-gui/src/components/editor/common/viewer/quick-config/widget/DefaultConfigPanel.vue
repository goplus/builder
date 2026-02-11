<script lang="ts" setup>
import ConfigPanel from '../common/ConfigPanel.vue'
import type { SpxProject } from '@/models/spx/project'
import ZorderConfigItem, { moveActionNames, type MoveAction } from '../common/ZorderConfigItem.vue'
import type { WidgetLocalConfig } from '../utils'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'

const props = defineProps<{
  localConfig: WidgetLocalConfig
  project: SpxProject
}>()

const editorCtx = useEditorCtx()

async function moveZorder(direction: MoveAction) {
  await editorCtx.state.history.doAction({ name: moveActionNames[direction] }, () => {
    const { localConfig, project } = props
    if (direction === 'up') {
      project.stage.upWidgetZorder(localConfig.id)
    } else if (direction === 'down') {
      project.stage.downWidgetZorder(localConfig.id)
    } else if (direction === 'top') {
      project.stage.topWidgetZorder(localConfig.id)
    } else if (direction === 'bottom') {
      project.stage.bottomWidgetZorder(localConfig.id)
    }
  })
}
</script>

<template>
  <ConfigPanel v-radar="{ name: 'Widget Quick Config Panel', desc: 'Quick config for widget layer order' }">
    <ZorderConfigItem type="widget" @move-zorder="moveZorder" />
  </ConfigPanel>
</template>

<style lang="scss" scoped></style>
