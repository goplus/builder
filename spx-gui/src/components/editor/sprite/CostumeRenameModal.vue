<template>
  <RenameModal :visible="visible" @cancel="handleCancel">
    <UIForm :form="form" has-success-feedback @submit="handleSubmit">
      <UIFormItem path="name">
        <UITextInput v-model:value="form.value.name" />
        <template #tip>{{ $t(costumeNameTip) }}</template>
      </UIFormItem>
      <RenameModalFooter @cancel="handleCancel" />
    </UIForm>
  </RenameModal>
</template>

<script setup lang="ts">
import { UITextInput, UIForm, UIFormItem, useForm } from '@/components/ui'
import type { Costume } from '@/models/costume'
import { costumeNameTip, validateCostumeName } from '@/models/common/asset-name'
import { useI18n } from '@/utils/i18n'
import RenameModal from '../panels/common/RenameModal.vue'
import RenameModalFooter from '../panels/common/RenameModalFooter.vue'
import { type Project } from '@/models/project'

const props = defineProps<{
  visible: boolean
  costume: Costume
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [void]
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.costume.name, validateName]
})

function handleCancel() {
  emit('cancelled')
}

async function handleSubmit() {
  if (form.value.name !== props.costume.name) {
    const action = { name: { en: 'Rename costume', zh: '重命名造型' } }
    await props.project.history.doAction(action, () => props.costume.setName(form.value.name))
  }
  emit('resolved')
}

function validateName(name: string) {
  if (name === props.costume.name) return
  return t(validateCostumeName(name, props.costume.parent) ?? null)
}
</script>
