<script lang="ts" setup>
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useAvatarUrl } from '@/stores/user/avatar'
import { useI18n } from '@/utils/i18n'
import { type User } from '@/apis/user'
import { UIImg, UIFormModal, UIForm, UIFormItem, UITextInput, UIButton, useForm } from '@/components/ui'
import { getCoverImgUrl } from './cover'
import { useUpdateSignedInUser } from '@/stores/user'

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
  description: [props.user.description, validateDescription]
})

function validateDescription(val: string) {
  if (val.length > 200) return t({ en: 'The input must be 200 characters or fewer', zh: '输入不能超过 200 字' })
  return null
}

function handleCancel() {
  emit('cancelled')
}

const updateProfile = useUpdateSignedInUser()

const handleSubmit = useMessageHandle(async () => {
  const updated = await updateProfile({ description: form.value.description })
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
    <UIImg class="avatar" :src="avatarUrl" />
    <UIForm :form="form" has-success-feedback @submit="handleSubmit.fn">
      <UIFormItem :label="$t({ en: 'Name', zh: '名字' })">
        <UITextInput
          v-radar="{ name: 'User name input', desc: 'Input field showing the user name' }"
          :value="user.displayName"
          disabled
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
          type="boring"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Confirm button', desc: 'Click to save profile changes' }"
          type="primary"
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
