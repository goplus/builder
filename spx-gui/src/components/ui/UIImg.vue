<template>
  <div class="ui-img">
    <img v-if="src" :src="src" :style="imgElStyle" />
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
const imgElStyle = computed(() =>
  props.src == null
    ? null
    : {
        objectFit: props.size
      }
)
</script>

<style lang="scss" scoped>
.ui-img {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ui-img img {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
