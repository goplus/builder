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
      <UIFormItem path="enableAdvancedLibrary">
        <UICheckbox v-model:checked="form.value.enableAdvancedLibrary">
          {{ $t({ en: 'Enable advanced library features', zh: '启用高级素材库功能' }) }}
        </UICheckbox>
      </UIFormItem>
      <footer class="footer">
        <UIButton
          v-radar="{ name: 'Cancel button', desc: 'Click to cancel token sign-in' }"
          type="boring"
          @click="handleCancel"
        >
          {{ $t({ en: 'Cancel', zh: '取消' }) }}
        </UIButton>
        <UIButton
          v-radar="{ name: 'Sign in button', desc: 'Click to sign in with token' }"
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
import { useI18n } from '@/utils/i18n'
import { usePageTitle } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { useUserStore, type UserInfoFromToken } from '@/stores/user'
import { UIForm, UIFormItem, UITextInput, UIButton, UICheckbox, useForm } from '@/components/ui'

const title = {
  en: 'Sign in with token',
  zh: '使用 Token 登录'
}

usePageTitle(title)

const router = useRouter()
const userStore = useUserStore()
const i18n = useI18n()

const userInfo = ref<UserInfoFromToken | null>(null)
const buttonText = computed(() => {
  if (userInfo.value == null) return i18n.t({ en: 'Sign in', zh: '登录' })
  const username = userInfo.value.displayName || userInfo.value.name
  return i18n.t({
    en: `Sign in as ${username}`,
    zh: `以 ${username} 登录`
  })
})

const form = useForm({
  token: ['', validateToken],
  enableAdvancedLibrary: [true]
})

function validateToken(token: string) {
  userInfo.value = null
  token = token.trim()
  if (token === '')
    return i18n.t({
      en: 'Token is required',
      zh: '请提供 Token'
    })
  try {
    userInfo.value = userStore.parseAccessToken(token)
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
    userStore.signInWithAccessToken(token, form.value.enableAdvancedLibrary)
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
