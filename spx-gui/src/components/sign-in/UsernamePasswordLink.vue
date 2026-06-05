<template>
  <a
    class="mt-2 inline-flex items-center gap-1 text-lg/6 text-grey-800 no-underline transition-colors duration-200 hover:text-[#0aa5be]"
    href="#"
    @click.prevent="$emit('click')"
  >
    {{ $t({ en: 'Sign in with username and password', zh: '用户名密码登录' }) }}
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.33325 4L10.3333 8L6.33325 12"
        stroke="currentColor"
        stroke-width="1.07"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </a>
</template>

<script setup lang="ts">
defineEmits<{
  click: []
}>()
</script>
