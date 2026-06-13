<script setup lang="ts">
import { ref } from 'vue'

import type { PasswordSignInPayload } from '@/apis/account'
import { UIForm, UIFormItem, UIFullWidthButton, UIIconTextInput, useForm } from '@/components/ui'
import { useI18n } from '@/utils/i18n'

import eyeIconUrl from './eye.svg'
import eyeOffIconUrl from './eye-off.svg'
import lockIconUrl from './lock.svg'
import userIconUrl from './user.svg'

defineProps<{
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  submit: [payload: PasswordSignInPayload]
}>()

const { t } = useI18n()
const showPassword = ref(false)

const form = useForm({
  username: ['', validateUsername],
  password: ['', validatePassword]
})

function validateUsername(value: string) {
  const trimmedValue = value.trim()
  if (trimmedValue === '')
    return t({
      en: 'Please enter username',
      zh: '请输入用户名'
    })
  if (/\s/.test(value))
    return t({
      en: 'Username cannot contain spaces',
      zh: '用户名不能包含空格'
    })
  return ''
}

function validatePassword(value: string) {
  if (value === '')
    return t({
      en: 'Please enter password',
      zh: '请输入密码'
    })
  return ''
}

function toggleShowPassword() {
  showPassword.value = !showPassword.value
}

async function handleSubmit() {
  emit('submit', { username: form.value.username.trim(), password: form.value.password })
}
</script>

<template>
  <UIForm :form="form" class="self-stretch flex flex-col items-center" @submit="handleSubmit">
    <UIFormItem path="username" class="w-full [&+&]:mt-4">
      <UIIconTextInput
        v-model="form.value.username"
        :placeholder="$t({ en: 'Username', zh: '用户名' })"
        :icon-url="userIconUrl"
      />
    </UIFormItem>

    <UIFormItem path="password" class="w-full [&+&]:mt-4">
      <UIIconTextInput
        v-model="form.value.password"
        :type="showPassword ? 'text' : 'password'"
        :placeholder="$t({ en: 'Password', zh: '密码' })"
        :icon-url="lockIconUrl"
        :right-icon-url="showPassword ? eyeOffIconUrl : eyeIconUrl"
        @right-icon-click="toggleShowPassword"
      />
    </UIFormItem>

    <UIFullWidthButton primary html-type="submit" class="mt-6" :disabled="isSubmitting">
      {{ isSubmitting ? $t({ en: 'Signing in…', zh: '登录中…' }) : $t({ en: 'Sign In', zh: '立即登录' }) }}
    </UIFullWidthButton>
  </UIForm>
</template>
