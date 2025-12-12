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
  /** Extra warning message */
  warning: LocaleMessage | null
}
</script>

<script setup lang="ts">
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import { UIFormModal, UIButton, UITextInput, UIForm, UIFormItem, useForm, UIIcon } from '@/components/ui'
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
    :radar="{ name: 'Rename modal', desc: 'Modal for renaming items' }"
    class="rename-modal"
    style="width: 512px"
    :title="$t({ en: 'Rename', zh: '重命名' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <UIFormItem path="name">
        <UITextInput
          v-model:value="form.value.name"
          v-radar="{ name: 'Name input', desc: 'Input field for new name' }"
        />
        <template #tip>{{ $t(target.inputTip) }}</template>
      </UIFormItem>
      <p v-if="target.warning != null" class="warning">
        <UIIcon class="icon" type="warning" />
        {{ $t(target.warning) }}
      </p>
      <footer class="footer">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel renaming' }"
          color="boring"
          @click="emit('cancelled')"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Confirm button', desc: 'Click to confirm renaming' }"
          color="primary"
          html-type="submit"
          :loading="handleSubmit.isLoading.value"
        >
          {{ $t({ en: 'Confirm', zh: '确认' }) }}
        </UIButton>
      </footer>
    </UIForm>
  </UIFormModal>
</template>

<style lang="scss" scoped>
.warning {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  color: var(--ui-color-yellow-500);
  align-items: flex-start;

  .icon {
    flex: 0 0 auto;
    height: 22px;
  }
}

.footer {
  margin-top: 40px;
  display: flex;
  gap: var(--ui-gap-middle);
  justify-content: flex-end;
}
</style>
