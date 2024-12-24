<script lang="ts">
export interface IRenameTarget {
  /** Current name */
  name: string
  /** Validate the new name */
  validateName(newName: string): LocaleMessage | null | undefined
  /** Apply the new name */
  applyName(newName: string): Promise<void>
  /** Tip for new name input */
  inputTip: LocaleMessage
}
</script>

<script setup lang="ts">
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { UIFormModal, UIButton, UITextInput, UIForm, UIFormItem, useForm } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  visible: boolean
  target: IRenameTarget
}>()

const emit = defineEmits<{
  resolved: [void]
  cancelled: []
}>()

const { t } = useI18n()

const form = useForm({
  name: [props.target.name, validateName]
})

const handleSubmit = useMessageHandle(
  async () => {
    if (form.value.name !== props.target.name) {
      await props.target.applyName(form.value.name)
    }
    emit('resolved')
  },
  {
    en: 'Failed to rename',
    zh: '重命名失败'
  }
)

function validateName(name: string) {
  if (name === props.target.name) return
  return t(props.target.validateName(name) ?? null)
}
</script>

<template>
  <UIFormModal
    class="rename-modal"
    style="width: 512px"
    :title="$t({ en: 'Rename', zh: '重命名' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <UIFormItem path="name">
        <UITextInput v-model:value="form.value.name" />
        <template #tip>{{ $t(target.inputTip) }}</template>
      </UIFormItem>
      <footer class="footer">
        <UIButton type="boring" @click="emit('cancelled')">
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton type="primary" html-type="submit" :loading="handleSubmit.isLoading.value">
          {{ $t({ en: 'Confirm', zh: '确认' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<style lang="scss" scoped>
.footer {
  margin-top: 40px;
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}
</style>
