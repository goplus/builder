<script setup lang="ts">
import bgImg from './banner.jpg'
</script>

<template>
  <div class="relative flex-none h-84.5 bg-grey-100 bg-cover bg-center" :style="{ backgroundImage: `url(${bgImg})` }">
    <div class="absolute left-1/2 top-1/2 -translate-x-[15%] -translate-y-1/2 whitespace-nowrap text-title">
      <div class="text-[46px] leading-none font-medium">
        {{ $t({ en: 'Explore the User Tutorial', zh: '探索用户教程' }) }}
      </div>
      <div class="mt-7 text-[18px]/7">
        {{
          $t({
            en: 'Build coding skills and develop computational thinking with XBuilder',
            zh: '通过 XBuilder 提升编程技能，培养程序化思维'
          })
        }}
      </div>
    </div>
  </div>
</template>
