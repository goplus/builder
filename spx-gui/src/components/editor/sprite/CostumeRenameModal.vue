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
import type { Sprite } from '@/models/sprite'
import { costumeNameTip, validateCostumeName } from '@/models/common/asset-name'
import { useI18n } from '@/utils/i18n'
import RenameModal from '../panels/common/RenameModal.vue'
import RenameModalFooter from '../panels/common/RenameModalFooter.vue'
import type { Project } from '@/models/project'

const props = defineProps<{
  visible: boolean
  costume: Costume
  sprite: Sprite
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.costume.name, validateName]
})

function handleCancel() {
  emit('cancelled')
}

function handleSubmit() {
  if (form.value.name !== props.costume.name) {
    props.project.history.doAction(
      { en: 'setName', zh: 'setName' },
      () => props.costume.setName(form.value.name)
    )
  }
  emit('resolved')
}

function validateName(name: string) {
  if (name === props.costume.name) return
  return t(validateCostumeName(name, props.sprite) ?? null)
}
</script>
