<script setup lang="ts">
import bgImg from '@ui-images/tutorials-banner.jpg'
</script>

<template>
  <section
    class="relative h-84.5 min-w-360 flex-none bg-grey-100 bg-cover bg-center"
    :style="{ backgroundImage: `url(${bgImg})` }"
  >
    <div class="absolute top-1/2 left-1/2 -translate-x-[15%] -translate-y-1/2 whitespace-nowrap text-title">
      <h1 class="m-0 text-[46px] leading-none font-medium">Explore the User Tutorials</h1>
      <p class="mt-7 text-[18px]/7">Learn XBuilder and improve programming skills</p>
    </div>
  </section>
</template>
