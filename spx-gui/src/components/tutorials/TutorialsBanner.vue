<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'

const i18n = useI18n()

const bannerTextClass = computed(() =>
  i18n.lang.value === 'zh' ? 'translate-x-[70%] -translate-y-[80%]' : '-translate-y-[80%]'
)
</script>

<template>
  <div class="relative flex items-center justify-center">
    <div class="overflow-hidden">
      <img
        src="@/components/tutorials/banner.png"
        alt="Tutorials Banner"
        class="h-85 w-full object-cover object-center"
      />
    </div>
    <div class="absolute left-1/2 top-1/2 whitespace-nowrap text-[#006375]" :class="bannerTextClass">
      <div class="text-36">{{ $t({ en: 'Explore the User Tutorial', zh: '探索用户教程' }) }}</div>
      <div class="mt-2 text-18">
        {{ $t({ en: 'Learn XBuilder and improve programming skills', zh: '学习 XBuilder，提高编程技能' }) }}
      </div>
    </div>
  </div>
</template>
