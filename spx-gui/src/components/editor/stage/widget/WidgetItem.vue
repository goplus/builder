<template>
  <UIEditorWidgetItem v-radar="radarNodeMeta" :name="widget.name" :selectable="selectable" :color="color">
    <template #icon>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="getIcon(widget)"></div>
    </template>
    <UICornerIcon
      v-if="removable"
      v-radar="{ name: 'Remove', desc: 'Click to remove the widget' }"
      type="trash"
      :color="color"
      @click="handleRemove"
    />
  </UIEditorWidgetItem>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UIEditorWidgetItem, UICornerIcon } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import type { Widget } from '@/models/widget'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { getIcon } from './icon'

const props = withDefaults(
  defineProps<{
    widget: Widget
    color?: 'stage' | 'primary'
    selectable?: false | { selected: boolean }
    removable?: boolean
  }>(),
  {
    color: 'stage',
    selectable: false,
    removable: false
  }
)

const editorCtx = useEditorCtx()

const radarNodeMeta = computed(() => {
  const name = `Widget item "${props.widget.name}"`
  const desc = props.selectable ? 'Click to select the widget and view more options' : ''
  return { name, desc }
})

const removable = computed(() => props.removable && props.selectable && props.selectable.selected)

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
</script>
