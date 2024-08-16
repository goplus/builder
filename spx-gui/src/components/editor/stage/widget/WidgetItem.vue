<template>
  <UIEditorWidgetItem :name="widget.name" :selected="selected">
    <template #icon>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="monitorIcon"></div>
    </template>
    <UICornerIcon v-if="selected" type="trash" color="stage" @click="handleRemove" />
  </UIEditorWidgetItem>
</template>

<script setup lang="ts">
import { UIEditorWidgetItem, UICornerIcon } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import type { Widget } from '@/models/widget'
import type { Stage } from '@/models/stage'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import monitorIcon from './monitor.svg?raw'

const props = defineProps<{
  stage: Stage
  widget: Widget
  selected: boolean
}>()

const editorCtx = useEditorCtx()

const handleRemove = useMessageHandle(
  async () => {
    const name = props.widget.name
    const action = { name: { en: `Remove widget ${name}`, zh: `删除控件 ${name}` } }
    await editorCtx.project.history.doAction(action, () => props.stage.removeWidget(name))
  },
  {
    en: 'Failed to remove widget',
    zh: '删除控件失败'
  }
).fn
</script>
