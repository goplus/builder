<script setup lang="ts">
import { showLicense } from '@/utils/env'
import { UILink } from '@/components/ui'
</script>

<template>
  <footer
    v-if="showLicense"
    class="flex h-12.5 w-full flex-[0_0_auto] items-center justify-center gap-6 text-12 text-grey-700"
  >
    <span class="flex items-center justify-center">{{ $t({ en: '© 2025 Qiniu Cloud.', zh: '© 2025 七牛云' }) }}</span>
    <UILink
      class="flex items-center justify-center no-underline"
      type="boring"
      target="_blank"
      href="https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=31011502000961"
    >
      <img class="mr-1 h-4 w-4" src="./license-icon.png" />沪公网安备 31011502000961 号
    </UILink>
    <UILink
      class="flex items-center justify-center no-underline"
      type="boring"
      target="_blank"
      href="https://beian.miit.gov.cn/"
    >
      浙 ICP 备 2025161674 号-3
    </UILink>
  </footer>
</template>
