<template>
  <RenameModal :visible="visible" @cancel="handleCancel">
    <UIForm :form="form" has-success-feedback @submit="handleSubmit">
      <UIFormItem path="name">
        <UITextInput v-model:value="form.value.name" />
        <template #tip>{{ $t(backdropNameTip) }}</template>
      </UIFormItem>
      <RenameModalFooter @cancel="handleCancel" />
    </UIForm>
  </RenameModal>
</template>

<script setup lang="ts">
import { UITextInput, UIForm, UIFormItem, useForm } from '@/components/ui'
import type { Backdrop } from '@/models/backdrop'
import { type Project } from '@/models/project'
import { backdropNameTip, validateBackdropName } from '@/models/common/asset-name'
import { useI18n } from '@/utils/i18n'
import RenameModal from '../panels/common/RenameModal.vue'
import RenameModalFooter from '../panels/common/RenameModalFooter.vue'

const props = defineProps<{
  visible: boolean
  backdrop: Backdrop
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.backdrop.name, validateName]
})

function handleCancel() {
  emit('cancelled')
}

async function handleSubmit() {
  if (form.value.name !== props.backdrop.name) {
    const action = { name: { en: 'Rename backdrop', zh: '重命名背景' } }
    await props.project.history.doAction(action, () => props.backdrop.setName(form.value.name))
  }
  emit('resolved')
}

function validateName(name: string) {
  if (name === props.backdrop.name) return
  return t(validateBackdropName(name, props.project.stage) ?? null)
}
</script>
