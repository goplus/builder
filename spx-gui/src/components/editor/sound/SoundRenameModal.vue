<template>
  <RenameModal :visible="visible" @cancel="handleCancel">
    <UIForm :form="form" @submit="handleSubmit">
      <UIFormItem path="name">
        <UITextInput v-model:value="form.value.name" />
        <template #tip>{{ $t(soundNameTip) }}</template>
      </UIFormItem>
      <RenameModalFooter @cancel="handleCancel" />
    </UIForm>
  </RenameModal>
</template>

<script setup lang="ts">
import { UITextInput, UIForm, UIFormItem, useForm } from '@/components/ui'
import type { Sound } from '@/models/sound'
import type { Project } from '@/models/project'
import { soundNameTip, validateSoundName } from '@/models/common/asset'
import { useI18n } from '@/utils/i18n'
import RenameModal from '../panels/common/RenameModal.vue'
import RenameModalFooter from '../panels/common/RenameModalFooter.vue'

const props = defineProps<{
  visible: boolean
  sound: Sound
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.sound.name, validateName]
})

function handleCancel() {
  emit('cancelled')
}

function handleSubmit() {
  props.sound.setName(form.value.name)
  emit('resolved')
}

function validateName(name: string) {
  if (name === props.sound.name) return
  return t(validateSoundName(name, props.project) ?? null)
}
</script>