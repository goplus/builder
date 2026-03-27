<script setup lang="ts">
import { computed } from 'vue'
import {
  UIButton,
  UIForm,
  UIFormItem,
  UIFormModal,
  UITextInput,
  useForm,
  type FormValidationResult
} from '@/components/ui'
import { isUsernameTaken } from '@/apis/user'
import { useModifySignedInUsername } from '@/stores/user'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'

const props = defineProps<{
  username: string
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [string]
}>()

const { t } = useI18n()
const currentUsername = computed(() => props.username)

const form = useForm({
  username: [currentUsername.value, validateUsername]
})

async function validateUsername(val: string): Promise<FormValidationResult> {
  const trimmed = val.trim()
  if (trimmed === '') return t({ en: 'The username must not be blank', zh: '用户名不可为空' })
  if (trimmed.toLowerCase() === currentUsername.value.toLowerCase()) return
  if (!/^[\w-]+$/.test(trimmed))
    return t({
      en: 'The username can only contain letters, digits, and the characters - and _.',
      zh: '用户名仅可包含字母、数字以及字符 - 和 _。'
    })
  if (trimmed.length > 100)
    return t({
      en: 'The username is too long (maximum is 100 characters)',
      zh: '用户名长度超出限制（最多 100 个字符）'
    })

  if (await isUsernameTaken(trimmed))
    return t({
      en: `Username ${trimmed} already exists`,
      zh: `用户名 ${trimmed} 已存在`
    })
}

function handleCancel() {
  emit('cancelled')
}

const modifySignedInUsername = useModifySignedInUsername()

const handleSubmit = useMessageHandle(async () => {
  const oldUsername = currentUsername.value
  const newUsername = form.value.username.trim()
  if (newUsername === oldUsername) {
    emit('resolved', newUsername)
    return newUsername
  }
  const updated = await modifySignedInUsername(newUsername)
  emit('resolved', updated.username)
  return updated.username
})
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Username input modal', desc: 'Modal for modifying username' }"
    :title="$t({ en: 'Modify username', zh: '修改用户名' })"
    :style="{ width: '560px' }"
    :visible="props.visible"
    :mask-closable="false"
    @update:visible="handleCancel"
  >
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <UIFormItem path="username">
        <UITextInput
          v-model:value="form.value.username"
          v-radar="{ name: 'Username input', desc: 'Input field for username' }"
          :placeholder="$t({ en: 'Please enter the username', zh: '请输入用户名' })"
          autofocus
        />
      </UIFormItem>
      <footer class="footer">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel modifying username' }"
          color="boring"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Confirm button', desc: 'Click to confirm modifying username' }"
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

<style scoped lang="scss">
.footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--ui-gap-middle);
  margin-top: var(--ui-gap-large);
  padding-bottom: 4px;
}
</style>
