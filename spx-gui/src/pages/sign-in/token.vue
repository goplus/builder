<template>
  <div class="page">
    <UIForm class="form" :form="form" @submit="handleSubmit.fn">
      <h1 class="title">{{ $t(title) }}</h1>
      <UIFormItem path="token">
        <UITextInput
          v-model:value="form.value.token"
          v-radar="{ name: 'Token input', desc: 'Input field for authentication token' }"
          class="input"
          type="textarea"
          :placeholder="$t({ en: 'Paste token here', zh: '在此粘贴 Token' })"
        />
      </UIFormItem>
      <footer class="footer">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel token sign-in' }"
          color="boring"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Sign-in button', desc: 'Click to sign in with token' }"
          color="primary"
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
<style scoped lang="scss">
.page {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.form {
  width: 320px;
  display: flex;
  flex-direction: column;
}

.title {
  margin-bottom: 1em;
  font-size: 16px;
  text-align: center;
}

.input {
  justify-self: stretch;
  height: 160px;
}

.footer {
  margin-top: 1em;
  display: flex;
  justify-content: center;
  gap: 1em;
}
</style>
