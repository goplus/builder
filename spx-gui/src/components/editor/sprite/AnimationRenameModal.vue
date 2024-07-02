<template>
  <RenameModal :visible="visible" @cancel="handleCancel">
    <UIForm :form="form" has-success-feedback @submit="handleSubmit">
      <UIFormItem path="name">
        <UITextInput v-model:value="form.value.name" />
        <template #tip>{{ $t(animationNameTip) }}</template>
      </UIFormItem>
      <RenameModalFooter @cancel="handleCancel" />
    </UIForm>
  </RenameModal>
</template>

<script setup lang="ts">
import { UITextInput, UIForm, UIFormItem, useForm } from '@/components/ui'
import type { Sprite } from '@/models/sprite'
import { animationNameTip, validateAnimationName } from '@/models/common/asset-name'
import { useI18n } from '@/utils/i18n'
import RenameModal from '../panels/common/RenameModal.vue'
import RenameModalFooter from '../panels/common/RenameModalFooter.vue'
import { type Project } from '@/models/project'
import type { Animation } from '@/models/animation'

const props = defineProps<{
  visible: boolean
  animation: Animation
  sprite: Sprite
  project: Project
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.animation.name, validateName]
})

function handleCancel() {
  emit('cancelled')
}

async function handleSubmit() {
  if (form.value.name !== props.animation.name) {
    const action = { name: { en: 'Rename animation', zh: '重命名动画' } }
    await props.project.history.doAction(action, () => props.animation.setName(form.value.name))
  }
  emit('resolved')
}

function validateName(name: string) {
  if (name === props.animation.name) return
  return t(validateAnimationName(name, props.sprite) ?? null)
}
</script>
