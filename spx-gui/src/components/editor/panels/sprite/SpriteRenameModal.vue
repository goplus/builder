<template>
  <UIFormModal
    class="sprite-rename-modal"
    :title="$t({ en: 'Rename', zh: '重命名' })"
    :visible="visible"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" @submit="handleSubmit">
      <UIFormItem path="name">
        <UITextInput v-model:value="form.value.name" />
        <template #tip>{{ $t(spriteNameTip) }}</template>
      </UIFormItem>
      <footer class="footer">
        <UIButton type="boring" @click="handleCancel">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton type="primary" html-type="submit">
          {{ $t({ en: 'Confirm', zh: '确认' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UITextInput, UIButton, UIForm, UIFormItem, UIFormModal, useForm } from '@/components/ui'
import type { Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { spriteNameTip, validateSpriteName } from '@/models/common/asset'
import { useI18n } from '@/utils/i18n'

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
  props.sprite.setName(form.value.name)
  emit('resolved')
}

function validateName(name: string) {
  if (name === props.sprite.name) return
  return t(validateSpriteName(name, props.project) ?? null)
}
</script>

<style scoped lang="scss">
.sprite-rename-modal {
  // TODO: this (`width`) is not working
  // the data-v-xxx of this component is not correctly added to the modal element
  width: 512px;
}
.footer {
  margin-top: 40px;
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}
</style>
