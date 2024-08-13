<template>
  <RenameModal :visible="visible" @cancel="handleCancel">
    <UIForm :form="form" has-success-feedback @submit="handleSubmit">
      <UIFormItem path="name">
        <UITextInput v-model:value="form.value.name" />
        <template #tip>{{ $t(widgetNameTip) }}</template>
      </UIFormItem>
      <RenameModalFooter @cancel="handleCancel" />
    </UIForm>
  </RenameModal>
</template>

<script setup lang="ts">
import { UITextInput, UIForm, UIFormItem, useForm } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import type { Widget } from '@/models/widget'
import { type Project } from '@/models/project'
import { widgetNameTip, validateWidgetName } from '@/models/common/asset-name'
import RenameModal from '../../panels/common/RenameModal.vue'
import RenameModalFooter from '../../panels/common/RenameModalFooter.vue'

const props = defineProps<{
  visible: boolean
  widget: Widget
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.widget.name, validateName]
})

function handleCancel() {
  emit('cancelled')
}

async function handleSubmit() {
  if (form.value.name !== props.widget.name) {
    const action = { name: { en: 'Rename widget', zh: '重命名控件' } }
    await props.project.history.doAction(action, () => props.widget.setName(form.value.name))
  }
  emit('resolved')
}

function validateName(name: string) {
  if (name === props.widget.name) return
  return t(validateWidgetName(name, props.project.stage) ?? null)
}
</script>
