<script setup lang="ts">
import { ref } from 'vue'

import type { PasswordSignInPayload } from '@/apis/account'
import { UIForm, UIFormItem, UIFullWidthButton, UIIconTextInput, useForm } from '@/components/ui'
import { useI18n } from '@/utils/i18n'

import eyeIconUrl from './eye.svg'
import eyeOffIconUrl from './eye-off.svg'
import lockIconUrl from './lock.svg'
import userIconUrl from './user.svg'

const props = defineProps<{
  submit: (payload: PasswordSignInPayload) => Promise<void>
}>()

const { t } = useI18n()
const showPassword = ref(false)
const isSubmitting = ref(false)

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
  isSubmitting.value = true
  try {
    await props.submit({ username: form.value.username.trim(), password: form.value.password })
  } finally {
    isSubmitting.value = false
  }
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
