<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { PasswordSignInPayload } from '@/apis/account'
import { UIForm, UIFormItem, UIFullWidthButton, UIIconTextInput, useForm } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useInterval } from '@/utils/utils'

import eyeIconUrl from './eye.svg'
import eyeOffIconUrl from './eye-off.svg'
import lockIconUrl from './lock.svg'
import userIconUrl from './user.svg'

const props = defineProps<{
  isSubmitting: boolean
  retryAfter: number | null
}>()

const emit = defineEmits<{
  submit: [payload: PasswordSignInPayload]
}>()

const { t } = useI18n()
const showPassword = ref(false)
const retrySecondsRemaining = ref(0)

function updateRetrySecondsRemaining() {
  retrySecondsRemaining.value =
    props.retryAfter == null ? 0 : Math.max(0, Math.ceil((props.retryAfter - Date.now()) / 1000))
}

watch(() => props.retryAfter, updateRetrySecondsRemaining, { immediate: true })

useInterval(updateRetrySecondsRemaining, () => (retrySecondsRemaining.value > 0 ? 1000 : null))

const isSubmitDisabled = computed(() => props.isSubmitting || retrySecondsRemaining.value > 0)
const submitText = computed(() => {
  if (retrySecondsRemaining.value > 0) {
    const minutes = Math.floor(retrySecondsRemaining.value / 60)
    const seconds = retrySecondsRemaining.value % 60
    const countdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    return t({
      en: `Try again in ${countdown}`,
      zh: `${countdown} 后重试`
    })
  }
  if (props.isSubmitting) return t({ en: 'Signing in…', zh: '登录中…' })
  return t({ en: 'Sign In', zh: '立即登录' })
})

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

function handleSubmit() {
  if (isSubmitDisabled.value) return
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

    <UIFullWidthButton primary html-type="submit" class="mt-6" :disabled="isSubmitDisabled">
      {{ submitText }}
    </UIFullWidthButton>
  </UIForm>
</template>
