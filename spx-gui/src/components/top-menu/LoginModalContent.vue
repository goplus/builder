<template>
  <n-card
    class="login-card"
    title="Modal"
    :bordered="false"
    size="huge"
    role="dialog"
    aria-modal="true"
    style="width: 600px"
  >
    <div class="login-dialog">
      <p>Please log in</p>
      <n-button @click="userStore.loggedIn = true">Login</n-button>
    </div>
    <template #footer> Footer </template>
  </n-card>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { useUserStore } from '@/store/modules/user'

const userStore = useUserStore()
</script>

<style scoped></style>
