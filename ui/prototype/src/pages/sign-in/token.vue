<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getSignedInUser } from '@/apis/user'
import UIButton from '@/components/ui/UIButton.vue'

const router = useRouter()
const user = getSignedInUser()
const token = ref('')
const touched = ref(false)
const tokenPreview = `prototype.${user.username}.offline`

const returnTo = computed(() => {
  const value = router.currentRoute.value.query.returnTo
  return typeof value === 'string' && value.startsWith('/') ? value : '/'
})

const error = computed(() => {
  if (!touched.value) return ''
  return token.value.trim() === '' ? 'Token is required' : ''
})

const buttonText = computed(() => {
  return token.value.trim() === '' ? 'Sign in' : `Sign in as ${user.username}`
})

function handleCancel() {
  router.push('/')
}

function handleSubmit() {
  touched.value = true
  if (error.value !== '') return
  router.push(returnTo.value)
}

onMounted(() => {
  document.title = 'Sign in with token - XBuilder'
})
</script>

<template>
  <main class="flex h-screen min-w-360 items-center justify-center bg-grey-100">
    <form class="flex w-80 flex-col" @submit.prevent="handleSubmit">
      <h1 class="mb-4 text-center text-xl text-title">Sign in with token</h1>

      <label class="flex flex-col">
        <span class="sr-only">Token</span>
        <textarea
          v-model="token"
          class="token-input h-40 resize-none rounded-md border border-grey-400 bg-grey-100 px-3 py-2 text-sm text-title outline-none transition-colors placeholder:text-grey-700 focus:border-primary-500"
          placeholder="Paste token here"
          @blur="touched = true"
        ></textarea>
      </label>

      <p class="mt-2 min-h-5 text-sm leading-5" :class="error === '' ? 'text-grey-700' : 'text-red-500'">
        {{ error === '' ? `Local preview token: ${tokenPreview}` : error }}
      </p>

      <footer class="mt-4 flex justify-center gap-4">
        <UIButton type="neutral" @click="handleCancel">Cancel</UIButton>
        <UIButton type="primary" @click="handleSubmit">{{ buttonText }}</UIButton>
      </footer>
    </form>
  </main>
</template>

<style scoped>
.token-input {
  line-height: 22px;
}
</style>
