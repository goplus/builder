<template>
  <div class="img" :style="imgStyle">
    <UILoading :visible="loading" :cover="!noCover" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UILoading from './UILoading.vue'

const props = withDefaults(
  defineProps<{
    src: string | null
    loading?: boolean
    size?: 'contain' | 'cover'
    noCover?: boolean
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
.img {
  position: relative;
  background-position: center;
  background-repeat: no-repeat;
}
</style>
