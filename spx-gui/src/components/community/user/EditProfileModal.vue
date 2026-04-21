<script lang="ts" setup>
import { computed, ref } from 'vue'
import { type User } from '@/apis/user'
import { selectFile } from '@/utils/file'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import {
  UIButton,
  UIForm,
  UIFormItem,
  UIFormModal,
  UIIcon,
  UIImg,
  UITextInput,
  useForm,
  useModal
} from '@/components/ui'
import { getCoverImgUrl } from './cover'
import { useUpdateSignedInUser } from '@/stores/user'
import { useAvatarUrl } from '@/stores/user/avatar'
import EditAvatarModal from './EditAvatarModal.vue'
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

const maxAvatarInputFileSize = 50 * 1024 * 1024
const acceptedAvatarFileExts = ['png', 'jpg', 'jpeg', 'webp']
const coverImgUrl = computed(() => getCoverImgUrl(props.user.username))
const pendingAvatarRef = ref<string | null>(null)
const currentAvatar = computed(() => pendingAvatarRef.value ?? props.user.avatar)
const avatarUrl = useAvatarUrl(() => currentAvatar.value)

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

function validateAvatarInputFile(file: globalThis.File) {
  if (file.type !== '' && !file.type.startsWith('image/')) {
    throw new DefaultException({
      en: 'Selected file must be an image',
      zh: '所选文件必须是图片'
    })
  }

  if (file.size > maxAvatarInputFileSize) {
    throw new DefaultException({
      en: 'Avatar image must be 50 MiB or smaller',
      zh: '头像图片不能超过 50 MiB'
    })
  }
}

const updateProfile = useUpdateSignedInUser()
const invokeEditAvatarModal = useModal(EditAvatarModal)

const handleChooseAvatar = useMessageHandle(
  async () => {
    const file = await selectFile({ accept: acceptedAvatarFileExts })
    validateAvatarInputFile(file)
    const updated = await invokeEditAvatarModal({ file })
    pendingAvatarRef.value = updated.avatar
  },
  { en: 'Failed to select avatar image', zh: '选择头像图片失败' }
)

function handleUsernameModified(newUsername: string) {
  emit('resolved', {
    ...props.user,
    username: newUsername,
    avatar: currentAvatar.value
  })
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
    <div
      class="-mx-6 -mt-5 h-42 bg-center bg-cover bg-no-repeat"
      :style="{ backgroundImage: `url(${coverImgUrl})` }"
    ></div>
    <div class="-mt-11 mb-6 flex items-start gap-5">
      <button
        v-radar="{ name: 'Edit avatar button', desc: 'Click to choose a new avatar image' }"
        class="group relative h-30 w-30 flex-none cursor-pointer border-none bg-transparent p-0 outline-none shadow-none"
        type="button"
        @click="handleChooseAvatar.fn"
      >
        <UIImg class="h-full w-full rounded-full border-2 border-grey-100 bg-grey-100" :src="avatarUrl" size="cover" />
        <UIIcon
          class="absolute right-0 bottom-0 h-8 w-8 text-turquoise-200 transition-[color,transform] duration-200 group-hover:text-turquoise-300 group-focus-visible:text-turquoise-300 group-active:scale-[0.96]"
          type="camera"
        />
      </button>
      <UserUsernameInline
        class="mt-16 min-w-0"
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
      <footer class="mt-5 flex justify-end gap-3">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel editing profile' }"
          type="neutral"
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
