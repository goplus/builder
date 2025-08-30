<template>
  <div class="ui-img" :style="imgStyle">
    <UILoading :visible="loading" cover :mask="false" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UILoading from './loading/UILoading.vue'
import { useExternalUrl } from '@/utils/utils'

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

// 使用 useExternalUrl 处理跨域图片
const safeImgUrl = useExternalUrl(() => props.src)

const imgStyle = computed(() =>
  safeImgUrl.value == null
    ? null
    : {
        backgroundImage: `url("${safeImgUrl.value}")`,
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
}
</style>
