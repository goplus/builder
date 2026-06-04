<template>
  <form class="password-login" @submit.prevent="handleSubmit">
    <InputWithIcon
      :model-value="username"
      :placeholder="$t({ en: 'Username', zh: '用户名' })"
      :error="usernameError"
      :icon-url="userIconUrl"
      @update:model-value="handleUsernameInput"
    />

    <InputWithIcon
      :model-value="password"
      :type="showPassword ? 'text' : 'password'"
      :placeholder="$t({ en: 'Password', zh: '密码' })"
      :error="passwordFieldError"
      :icon-url="lockIconUrl"
      :right-icon-url="showPassword ? eyeOffIconUrl : eyeIconUrl"
      @update:model-value="handlePasswordInput"
      @right-icon-click="toggleShowPassword"
    />

    <div v-if="submitError" class="submit-error">{{ submitError }}</div>

    <button type="submit" class="submit-button" :disabled="isSubmitting">
      {{ isSubmitting ? $t({ en: 'Signing in…', zh: '登录中…' }) : $t({ en: 'Sign In', zh: '立即登录' }) }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import eyeIconUrl from '@/account-web/assets/icons/eye.svg'
import eyeOffIconUrl from '@/account-web/assets/icons/eye-off.svg'
import lockIconUrl from '@/account-web/assets/icons/lock.svg'
import userIconUrl from '@/account-web/assets/icons/user.svg'
import type { PasswordSignInPayload } from '@/account-web/apis/account'
import { useI18n } from '@/utils/i18n'

import InputWithIcon from './InputWithIcon.vue'

const props = defineProps<{
  submit: (payload: PasswordSignInPayload) => Promise<void>
}>()

const { t } = useI18n()
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const usernameError = ref('')
const passwordFieldError = ref('')
const submitError = ref<string | null>(null)
const isSubmitting = ref(false)

function validateUsername(value: string) {
  if (value === '')
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

function handleUsernameInput(value: string) {
  username.value = value
  usernameError.value = validateUsername(value)
  submitError.value = null
}

function handlePasswordInput(value: string) {
  password.value = value
  passwordFieldError.value = validatePassword(value)
  submitError.value = null
}

function toggleShowPassword() {
  showPassword.value = !showPassword.value
}

async function handleSubmit() {
  const trimmedUsername = username.value.trim()
  const nextUsernameError = validateUsername(trimmedUsername)
  const nextPasswordFieldError = validatePassword(password.value)
  usernameError.value = nextUsernameError
  passwordFieldError.value = nextPasswordFieldError
  if (nextUsernameError !== '' || nextPasswordFieldError !== '') return

  isSubmitting.value = true
  submitError.value = null

  try {
    await props.submit({ username: trimmedUsername, password: password.value })
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.password-login {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.submit-error {
  width: 100%;
  color: #ff4d4f;
  font-size: 14px;
}

.submit-button {
  width: 100%;
  height: 50px;
  margin-top: 8px;
  font-size: 16px;
  color: #fff;
  background-color: #0bc0cf;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: wait;
}
</style>
