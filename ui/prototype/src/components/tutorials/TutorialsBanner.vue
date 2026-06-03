<script setup lang="ts">
import bgImg from '@ui-images/tutorials-banner.jpg'
</script>

<template>
  <section
    class="relative h-84.5 min-w-360 flex-none bg-grey-100 bg-cover bg-center"
    :style="{ backgroundImage: `url(${bgImg})` }"
  >
    <div class="absolute top-1/2 left-1/2 -translate-x-[15%] -translate-y-1/2 whitespace-nowrap text-title">
      <h1 class="tutorials-banner-title">Explore the User Tutorials</h1>
      <p class="tutorials-banner-subtitle">Learn XBuilder and improve programming skills</p>
    </div>
  </section>
</template>

<style scoped>
.tutorials-banner-title {
  margin: 0;
  font-size: 46px;
  line-height: 1;
  font-weight: 500;
}

.tutorials-banner-subtitle {
  margin: 28px 0 0;
  font-size: 18px;
  line-height: 28px;
}
</style>
