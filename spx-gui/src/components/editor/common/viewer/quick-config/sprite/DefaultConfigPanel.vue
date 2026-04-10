<script lang="ts" setup>
import { UITooltip } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import type { SpxProject } from '@/models/spx/project'
import ConfigItem from '../common/ConfigItem.vue'
import ZorderConfigDropdown, { moveActionNames, type MoveAction } from '../common/ZorderConfigDropdown.vue'
import type { SpriteLocalConfig } from '../utils'
import { useQuickConfigContext } from '../QuickConfigWrapper.vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'

const props = defineProps<{
  localConfig: SpriteLocalConfig
  project: SpxProject
}>()

const editorCtx = useEditorCtx()
const { updateConfigType } = useQuickConfigContext()

function handleOpenSubPanel(configType: 'pos' | 'rotation' | 'size') {
  updateConfigType(configType, true)
}

async function moveZorder(direction: MoveAction) {
  await editorCtx.state.history.doAction({ name: moveActionNames[direction] }, () => {
    const { localConfig, project } = props
    if (direction === 'up') {
      project.upSpriteZorder(localConfig.id)
    } else if (direction === 'down') {
      project.downSpriteZorder(localConfig.id)
    } else if (direction === 'top') {
      project.topSpriteZorder(localConfig.id)
    } else if (direction === 'bottom') {
      project.bottomSpriteZorder(localConfig.id)
    }
  })
}
</script>

<template>
  <ConfigPanel
    v-radar="{
      name: 'Sprite Quick Config Panel',
      desc: 'Quick config for sprite position, rotation, size and layer order'
    }"
  >
    <div class="flex items-center gap-1">
      <UITooltip>
        {{ $t({ en: 'Position', zh: '位置' }) }}
        <template #trigger>
          <ConfigItem icon="position" @click="handleOpenSubPanel('pos')" />
        </template>
      </UITooltip>
      <UITooltip>
        {{ $t({ en: 'Rotation', zh: '旋转' }) }}
        <template #trigger>
          <ConfigItem icon="rotate" @click="handleOpenSubPanel('rotation')" />
        </template>
      </UITooltip>
      <UITooltip>
        {{ $t({ en: 'Size', zh: '大小' }) }}
        <template #trigger>
          <ConfigItem icon="resize" @click="handleOpenSubPanel('size')" />
        </template>
      </UITooltip>
      <ZorderConfigDropdown type="sprite" @move-zorder="moveZorder">
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
