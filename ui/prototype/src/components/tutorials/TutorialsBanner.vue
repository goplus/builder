<script setup lang="ts">
import bannerUrl from '@ui-images/banner.png'
</script>

<template>
  <div class="tutorials-banner" :style="{ backgroundImage: `url(${bannerUrl})` }">
    <div class="banner-copy">
      <div class="banner-title">{{ $t({ en: 'Explore the User Tutorial', zh: '探索用户教程' }) }}</div>
      <div class="banner-subtitle">
        {{ $t({ en: 'Build coding skills and develop a programming mindset', zh: '构建编程技能，培养程序思维' }) }}
      </div>
    </div>
  </div>
</template>
