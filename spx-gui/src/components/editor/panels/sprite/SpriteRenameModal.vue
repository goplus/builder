<template>
  <RenameModal :visible="visible" @cancel="handleCancel">
    <UIForm :form="form" has-success-feedback @submit="handleSubmit">
      <UIFormItem path="name">
        <UITextInput v-model:value="form.value.name" />
        <template #tip>{{ $t(spriteNameTip) }}</template>
      </UIFormItem>
      <RenameModalFooter @cancel="handleCancel" />
    </UIForm>
  </RenameModal>
</template>

<script setup lang="ts">
import { UITextInput, UIForm, UIFormItem, useForm } from '@/components/ui'
import type { Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { spriteNameTip, validateSpriteName } from '@/models/common/asset-name'
import { useI18n } from '@/utils/i18n'
import RenameModal from '../common/RenameModal.vue'
import RenameModalFooter from '../common/RenameModalFooter.vue'

const props = defineProps<{
  visible: boolean
  sprite: Sprite
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.sprite.name, validateName]
})

function handleCancel() {
  emit('cancelled')
}

function handleSubmit() {
  if (form.value.name !== props.sprite.name) {
    props.project.history.doAction(
      { en: 'setName', zh: 'setName' },
      () => props.sprite.setName(form.value.name)
    )
  }
  emit('resolved')
}

function validateName(name: string) {
  if (name === props.sprite.name) return
  return t(validateSpriteName(name, props.project) ?? null)
}
</script>
