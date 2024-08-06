<script setup lang="ts">
import markdownit from 'markdown-it'
import { ref, watchEffect } from 'vue'
const props = defineProps<{
  markdown: string
}>()

const renderHtml = ref<string>('')

watchEffect(() => {
  renderHtml.value = markdownit().render(props.markdown)
})
</script>

<template>
  <article class="document-detail">
    <!--  eslint-disable vue/no-v-html  -->
    <main v-html="renderHtml"></main>
  </article>
</template>

<style scoped lang="scss">
.document-detail {
  background-color: white;
}
</style>
