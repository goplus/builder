<template>
  <div class="ui-img" :style="imgStyle">
    <UILoading :visible="loading" cover :mask="false" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UILoading from './loading/UILoading.vue'

const props = withDefaults(
  defineProps<{
    src: string | null
    loading?: boolean
    size?: 'contain' | 'cover'
  }>(),
  {
    // TODO: loading for public URL fetching
    loading: false,
    size: 'contain'
  }
)
const imgStyle = computed(() =>
  props.src == null
    ? null
    : {
        backgroundImage: `url("${props.src}")`,
        backgroundSize: props.size
      }
)
</script>

<style lang="scss" scoped>
.ui-img {
  position: relative;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  // Disable image smoothing to keep pixelated look, so it looks good for pixel art assets
  // See details in https://github.com/goplus/builder/issues/2214
  image-rendering: pixelated;
}
</style>
