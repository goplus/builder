<script setup lang="ts">
import NotificationLink from './NotificationLink.vue'

withDefaults(
  defineProps<{
    /** Missing if Markdown sanitization dropped an unsafe URL */
    src?: string | null
    alt?: string
    title?: string | null
  }>(),
  { src: null, alt: '', title: null }
)
</script>

<template>
  <NotificationLink v-slot="{ url }" :href="src" :title="title ?? alt">
    <img
      v-if="url != null"
      class="my-2 block max-h-96 max-w-full rounded-lg object-contain"
      :src="url"
      :alt="alt"
      crossorigin="anonymous"
    />
    <span v-else>{{ alt }}</span>
  </NotificationLink>
</template>
