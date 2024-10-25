<!-- eslint-disable vue/no-v-html -->
<template>
  <UITooltip placement="bottom">
    <template #trigger>
      <div class="lang" @click="toggleLang" v-html="langContent"></div>
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
  // Refresh the page to apply the new language for monaco editor
  location.reload()
}
</script>

<style lang="scss" scoped>
.lang {
  height: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;
  cursor: pointer;

  &:hover {
    background-color: var(--ui-color-primary-600);
  }
}
</style>
