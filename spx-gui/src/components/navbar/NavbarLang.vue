<!-- eslint-disable vue/no-v-html -->
<template>
  <UITooltip placement="bottom">
    <template #trigger>
      <div
        v-radar="{ name: 'Language switcher', desc: 'Click to switch between English and Chinese' }"
        class="flex h-full cursor-pointer items-center px-5 hover:bg-primary-600"
        @click="toggleLang"
        v-html="langContent"
      ></div>
    </template>
    {{ $t({ en: 'English / 中文', zh: '中文 / English' }) }}
  </UITooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UITooltip } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import enSvg from './icons/en.svg?raw'
import zhSvg from './icons/zh.svg?raw'

const i18n = useI18n()
const langContent = computed(() => (i18n.lang.value === 'en' ? enSvg : zhSvg))

function toggleLang() {
  i18n.setLang(i18n.lang.value === 'en' ? 'zh' : 'en')
}
</script>
