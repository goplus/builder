<template>
  <div class="h-full w-full flex items-center justify-center">
    <UIForm class="w-80 flex flex-col" :form="form" @submit="handleSubmit.fn">
      <h1 class="mb-4 text-center text-xl">{{ $t(title) }}</h1>
      <UIFormItem path="token">
        <UITextInput
          v-model:value="form.value.token"
          v-radar="{ name: 'Token input', desc: 'Input field for authentication token' }"
          class="justify-self-stretch h-40"
          type="textarea"
          :placeholder="$t({ en: 'Paste token here', zh: '在此粘贴 Token' })"
        />
      </UIFormItem>
      <footer class="mt-4 flex justify-center gap-4">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel token sign-in' }"
          type="neutral"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Sign-in button', desc: 'Click to sign in with token' }"
          type="primary"
          html-type="submit"
          :loading="handleSubmit.isLoading.value"
        >
          {{ buttonText }}
        </UIButton>
      </footer>
    </UIForm>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { jwtDecode } from 'jwt-decode'
import { useI18n } from '@/utils/i18n'
import { usePageTitle } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { signInWithAccessToken } from '@/stores/user'
import { UIForm, UIFormItem, UITextInput, UIButton, useForm } from '@/components/ui'

const title = {
  en: 'Sign in with token',
  zh: '使用 Token 登录'
}

usePageTitle(title)

const router = useRouter()
const i18n = useI18n()

const username = ref<string | null>(null)
const buttonText = computed(() => {
  if (username.value == null) return i18n.t({ en: 'Sign in', zh: '登录' })
  return i18n.t({
    en: `Sign in as ${username.value}`,
    zh: `以 ${username.value} 登录`
  })
})

const form = useForm({
  token: ['', validateToken]
})

function validateToken(token: string) {
  username.value = null
  token = token.trim()
  if (token === '')
    return i18n.t({
      en: 'Token is required',
      zh: '请提供 Token'
    })
  try {
    const decoded = jwtDecode<{ name: string }>(token)
    username.value = decoded.name
  } catch (e) {
    return i18n.t({
      en: 'Invalid token: ' + e,
      zh: '无效的 Token：' + e
    })
  }
}

function handleCancel() {
  router.push('/')
}

const handleSubmit = useMessageHandle(
  async () => {
    const token = form.value.token.trim()
    signInWithAccessToken(token)
    router.push('/')
  },
  {
    en: 'Failed to signin',
    zh: '登录失败'
  }
)
</script>
