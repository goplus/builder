<template>
  <EditorList color="stage" :add-text="$t({ en: 'Add widget', zh: '添加控件' })">
    <WidgetItem
      v-for="widget in stage.widgets"
      :key="widget.name"
      :stage="stage"
      :widget="widget"
      :selected="selected?.name === widget.name"
      @click="handleSelect(widget)"
    />
    <template #add-options>
      <UIMenu>
        <UIMenuItem @click="handleAddMonitor">{{ $t({ en: 'Monitor', zh: '监视器' }) }}</UIMenuItem>
      </UIMenu>
    </template>
    <template #detail>
      <WidgetDetail v-if="selected != null" :widget="selected" />
    </template>
  </EditorList>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { UIMenu, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { type Widget } from '@/models/widget'
import { Monitor } from '@/models/widget/monitor'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import EditorList from '../../common/EditorList.vue'
import WidgetItem from './WidgetItem.vue'
import WidgetDetail from './detail/WidgetDetail.vue'

const editorCtx = useEditorCtx()
const stage = computed(() => editorCtx.project.stage)
const selected = computed(() => stage.value.selectedWidget)

function handleSelect(widget: Widget) {
  stage.value.selectWidget(widget.name)
}

const handleAddMonitor = useMessageHandle(
  async () => {
    const monitor = await Monitor.create()
    const action = { name: { en: 'Add widget', zh: '添加控件' } }
    await editorCtx.project.history.doAction(action, () => {
      stage.value.addWidget(monitor)
      stage.value.selectWidget(monitor.name)
    })
  },
  {
    en: 'Failed to add widget',
    zh: '添加控件失败'
  }
).fn

onMounted(() => {
  stage.value.autoSelectWidget()
})

onUnmounted(() => {
  stage.value.selectWidget(null)
})
</script>
