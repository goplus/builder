<template>
  <UIEmpty v-if="stage.widgets.length === 0" size="extra-large">
    {{ $t({ en: 'No widgets', zh: '没有控件' }) }}
    <template #op>
      <UIButton type="boring" size="large" @click="handleAddMonitor">
        <template #icon>
          <img :src="monitorIcon" />
        </template>
        {{ $t({ en: 'Add widget Monitor', zh: '添加监视器控件' }) }}
      </UIButton>
    </template>
  </UIEmpty>
  <EditorList v-else color="stage" :add-text="$t({ en: 'Add widget', zh: '添加控件' })">
    <WidgetItem
      v-for="widget in stage.widgets"
      :key="widget.id"
      :stage="stage"
      :widget="widget"
      :selected="selected?.id === widget.id"
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
import { UIMenu, UIMenuItem, UIEmpty, UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { type Widget } from '@/models/widget'
import { useAddMonitor } from '@/components/asset'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import EditorList from '../../common/EditorList.vue'
import WidgetItem from './WidgetItem.vue'
import WidgetDetail from './detail/WidgetDetail.vue'
import monitorIcon from './monitor-gray.svg'

const editorCtx = useEditorCtx()
const stage = computed(() => editorCtx.project.stage)
const selected = computed(() => stage.value.selectedWidget)

function handleSelect(widget: Widget) {
  stage.value.selectWidget(widget.id)
}

const addMonitor = useAddMonitor()

const handleAddMonitor = useMessageHandle(() => addMonitor(editorCtx.project), {
  en: 'Failed to add widget',
  zh: '添加控件失败'
}).fn

onMounted(() => {
  stage.value.autoSelectWidget()
})

onUnmounted(() => {
  stage.value.selectWidget(null)
})
</script>
