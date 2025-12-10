<script setup lang="ts">
import { computed } from 'vue'
import { UIEditorWidgetItem, UIMenuItem } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import type { Widget } from '@/models/widget'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { getIcon } from './icon'
import CornerMenu from '../../common/CornerMenu.vue'
import { useRenameWidget } from '@/components/asset'
import { RenameMenuItem, RemoveMenuItem, DuplicateMenuItem } from '@/components/editor/common/'

const props = withDefaults(
  defineProps<{
    widget: Widget
    color?: 'stage' | 'primary'
    selectable?: false | { selected: boolean }
    operable?: boolean
  }>(),
  {
    color: 'stage',
    selectable: false,
    operable: false
  }
)

const editorCtx = useEditorCtx()

const radarNodeMeta = computed(() => {
  const name = `Widget item "${props.widget.name}"`
  const desc = props.selectable ? 'Click to select the widget and view more options' : ''
  return { name, desc }
})

function toggleWidgetVisible() {
  const name = props.widget.name
  const action = { name: { en: `Toggle visibility for widget ${name}`, zh: `切换控件 ${name} 的可见性` } }
  editorCtx.project.history.doAction(action, () => props.widget.setVisible(!props.widget.visible))
}

const { fn: handleDuplicate } = useMessageHandle(
  async () => {
    const widget = props.widget
    const { stage } = widget
    if (stage == null) throw new Error('stage expected')

    const action = { name: { en: `Duplicate widget ${widget.name}`, zh: `复制控件 ${widget.name}` } }
    await editorCtx.project.history.doAction(action, () => {
      const newWidget = widget.clone()
      stage.addWidgetAfter(newWidget, widget.id)
      editorCtx.state.selectWidget(newWidget.id)
    })
  },
  {
    en: 'Failed to duplicate widget',
    zh: '复制控件失败'
  }
)

const handleRemove = useMessageHandle(
  async () => {
    const { stage, name } = props.widget
    if (stage == null) throw new Error('stage expected')
    const action = { name: { en: `Remove widget ${name}`, zh: `删除控件 ${name}` } }
    await editorCtx.project.history.doAction(action, () => stage.removeWidget(props.widget.id))
  },
  {
    en: 'Failed to remove widget',
    zh: '删除控件失败'
  }
).fn

const renameWidget = useRenameWidget()
const { fn: handleRename } = useMessageHandle(() => renameWidget(props.widget), {
  en: 'Failed to rename widget',
  zh: '重命名控件失败'
})
</script>

<template>
  <UIEditorWidgetItem
    v-radar="radarNodeMeta"
    :name="widget.name"
    :selectable="selectable"
    :color="color"
    :visible="widget.visible"
  >
    <template #icon>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="getIcon(widget)"></div>
    </template>
    <CornerMenu v-if="operable && selectable && selectable.selected" :color="color">
      <UIMenuItem
        v-radar="{ name: 'Visibility control', desc: 'Control to toggle widget visibility' }"
        @click="toggleWidgetVisible"
      >
        {{ $t({ en: `${widget.visible ? 'Hide' : 'Show'} Widget`, zh: `${widget.visible ? '隐藏' : '显示'}控件` }) }}
      </UIMenuItem>
      <DuplicateMenuItem
        v-radar="{ name: 'Duplicate', desc: 'Click to duplicate the widget' }"
        @click="handleDuplicate"
      />
      <RenameMenuItem v-radar="{ name: 'Rename', desc: 'Click to rename the widget' }" @click="handleRename" />
      <RemoveMenuItem v-radar="{ name: 'Remove', desc: 'Click to remove the widget' }" @click="handleRemove" />
    </CornerMenu>
  </UIEditorWidgetItem>
</template>
