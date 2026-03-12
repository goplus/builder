<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { type User } from '@/apis/user'
import { UIFormModal, UIForm, UIFormItem, UITextInput, UIButton, UIImg, useForm } from '@/components/ui'
import { getCoverImgUrl } from './cover'
import { useUpdateSignedInUser } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import UserUsernameInline from './UserUsernameInline.vue'

const props = defineProps<{
  user: User
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [User]
}>()

const { t } = useI18n()

const coverImgUrl = computed(() => getCoverImgUrl(props.user.username))
const avatarUrl = useAvatarUrl(() => props.user.avatar)

const form = useForm({
  displayName: [props.user.displayName, validateDisplayName],
  description: [props.user.description, validateDescription]
})

function validateDisplayName(val: string) {
  const trimmed = val.trim()
  if (trimmed === '') return t({ en: 'The name must not be blank', zh: '名字不可为空' })
  if (trimmed.length > 100) return t({ en: 'The name must be 100 characters or fewer', zh: '名字不能超过 100 字' })
  return null
}

function validateDescription(val: string) {
  const trimmed = val.trim()
  if (trimmed.length > 200)
    return t({ en: 'The description must be 200 characters or fewer', zh: '个人简介不能超过 200 字' })
  return null
}

function handleCancel() {
  emit('cancelled')
}

const updateProfile = useUpdateSignedInUser()

function handleUsernameModified(newUsername: string) {
  emit('resolved', { ...props.user, username: newUsername })
}

const handleSubmit = useMessageHandle(async () => {
  const updated = await updateProfile({
    displayName: form.value.displayName.trim(),
    description: form.value.description.trim()
  })
  emit('resolved', updated)
})
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Edit profile modal', desc: 'Modal for editing user profile' }"
    :title="$t({ en: 'Edit profile', zh: '编辑个人信息' })"
    :style="{ width: '560px' }"
    :visible="props.visible"
    @update:visible="handleCancel"
  >
    <div class="cover" :style="{ backgroundImage: `url(${coverImgUrl})` }"></div>
    <div class="account-section">
      <UIImg class="avatar" :src="avatarUrl" />
      <UserUsernameInline
        class="account-username"
        :username="props.user.username"
        show-modify
        @modified="handleUsernameModified"
      />
    </div>
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <UIFormItem :label="$t({ en: 'Name', zh: '名字' })" path="displayName">
        <UITextInput
          v-model:value="form.value.displayName"
          v-radar="{ name: 'Display name input', desc: 'Input field for user display name' }"
        />
      </UIFormItem>
      <UIFormItem :label="$t({ en: 'About me', zh: '关于我' })" path="description">
        <UITextInput
          v-model:value="form.value.description"
          v-radar="{ name: 'About me input', desc: 'Input field for user description' }"
          type="textarea"
          :placeholder="$t({ en: 'Tell us something about you', zh: '介绍一下自己' })"
        />
      </UIFormItem>
      <footer class="footer">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel editing profile' }"
          color="boring"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Confirm button', desc: 'Click to save profile changes' }"
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
.cover {
  margin: -20px -24px 0;
  height: 168px;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.account-section {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin: -44px 0 var(--ui-gap-large);
}

.avatar {
  flex: 0 0 auto;
  width: 120px;
  height: 120px;
  border: 2px solid var(--ui-color-grey-100);
  border-radius: 50%;
  background-color: var(--ui-color-grey-100);
}

.account-username {
  min-width: 0;
  margin-top: 64px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
