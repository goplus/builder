<script lang="ts" setup>
import type { SpxProject } from '@/models/spx/project'
import { UITooltip } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import ConfigItem from '../common/ConfigItem.vue'
import ZorderConfigDropdown, { moveActionNames, type MoveAction } from '../common/ZorderConfigDropdown.vue'
import type { WidgetLocalConfig } from '../utils'
import { useQuickConfigContext } from '../QuickConfigWrapper.vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'

const props = defineProps<{
  localConfig: WidgetLocalConfig
  project: SpxProject
}>()

const editorCtx = useEditorCtx()
const { updateConfigType } = useQuickConfigContext()

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
    <div class="default-config-wrapper">
      <UITooltip>
        {{ $t({ en: 'Position', zh: '位置' }) }}
        <template #trigger>
          <ConfigItem icon="position" @click="updateConfigType('pos')" />
        </template>
      </UITooltip>
      <UITooltip>
        {{ $t({ en: 'Size', zh: '大小' }) }}
        <template #trigger>
          <ConfigItem icon="resize" @click="updateConfigType('size')" />
        </template>
      </UITooltip>
      <ZorderConfigDropdown type="widget" @move-zorder="moveZorder">
        <UITooltip>
          {{ $t({ en: 'Layer order', zh: '图层顺序' }) }}
          <template #trigger>
            <ConfigItem icon="layer" />
          </template>
        </UITooltip>
      </ZorderConfigDropdown>
    </div>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.default-config-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
