<script lang="ts" setup>
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { updateProfile, type User } from '@/apis/user'
import {
  UIImg,
  UIFormModal,
  UIForm,
  UIFormItem,
  UITextInput,
  UIButton,
  useForm
} from '@/components/ui'

const props = defineProps<{
  user: User
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [User]
}>()

const { t } = useI18n()

const form = useForm({
  description: [props.user.description, validateDescription]
})

function validateDescription(val: string) {
  if (val.length > 200)
    return t({ en: 'The input must be 200 characters or fewer', zh: '输入不能超过 200 字' })
  return null
}

function handleCancel() {
  emit('cancelled')
}

const handleSubmit = useMessageHandle(
  async () => {
    const updated = await updateProfile({ description: form.value.description })
    emit('resolved', updated)
  },
  { en: 'Failed to update profile', zh: '更新个人信息失败' }
)
</script>

<template>
  <UIFormModal
    :title="$t({ en: 'Edit profile', zh: '编辑个人信息' })"
    :style="{ width: '560px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <div class="cover"></div>
    <UIImg class="avatar" :src="user.avatar" />
    <!-- TODO: header & avatar -->
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <UIFormItem :label="$t({ en: 'Name', zh: '名字' })">
        <UITextInput :value="user.displayName" disabled />
      </UIFormItem>
      <UIFormItem :label="$t({ en: 'About me', zh: '关于我' })" path="description">
        <UITextInput
          v-model:value="form.value.description"
          type="textarea"
          :placeholder="$t({ en: 'Tell us something about you', zh: '介绍一下自己' })"
        />
      </UIFormItem>
      <footer class="footer">
        <UIButton type="boring" @click="handleCancel">
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
.cover {
  margin: -20px -24px 0;
  height: 168px;
  background: center / cover no-repeat url(./cover.jpg);
}

.avatar {
  margin-top: -48px;
  margin-bottom: 20px;
  width: 120px;
  height: 120px;
  border: 2px solid var(--ui-color-grey-100);
  border-radius: 50%;
  background-color: var(--ui-color-grey-100);
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
