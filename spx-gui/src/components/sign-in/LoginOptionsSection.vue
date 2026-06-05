<template>
  <div class="self-stretch flex flex-col items-center gap-5">
    <ProviderLoginButton
      v-for="(provider, index) in providers"
      :key="provider.name"
      :provider="provider"
      :primary="index === 0"
      :disabled="disabled"
      @click="$emit('select-provider', provider)"
    />
    <UsernamePasswordLink @click="$emit('open-password')" />
  </div>
</template>

<script setup lang="ts">
import type { IdentityProvider } from '@/apis/account-session'

import ProviderLoginButton from './ProviderLoginButton/ProviderLoginButton.vue'
import UsernamePasswordLink from './UsernamePasswordLink.vue'

withDefaults(
  defineProps<{
    providers: IdentityProvider[]
    disabled?: boolean
  }>(),
  {
    disabled: false
  }
)

defineEmits<{
  'select-provider': [provider: IdentityProvider]
  'open-password': []
}>()
</script>
