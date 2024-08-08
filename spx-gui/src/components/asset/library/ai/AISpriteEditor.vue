<template>
  <div class="container">
    <AnimationPlayer 
      v-if="sprite !== null && selectedAnimation !== null"
      :costumes="selectedAnimation.costumes"
      :duration="selectedAnimation.duration"
      :sound="null"
      :style="{ width: '100%', height: '100%' }"
    />
  </div>
</template>

<script lang="ts" setup>
import { isContentReady, type TaggedAIAssetData } from '@/apis/aigc';
import type { AssetType } from '@/apis/asset';
import AnimationPlayer from '@/components/editor/sprite/animation/AnimationPlayer.vue';
import { cachedConvertAssetData } from '@/models/common/asset';
import type { Sprite } from '@/models/sprite';
import { useAsyncComputed } from '@/utils/utils';
import { computed, ref } from 'vue'

const props = defineProps<{
  asset: TaggedAIAssetData<AssetType.Sprite>
}>()

const sprite = useAsyncComputed<Sprite | undefined>(() => {
  if (!props.asset[isContentReady]) {
    return new Promise((resolve) => resolve(undefined))
  }
  return cachedConvertAssetData(props.asset as Required<TaggedAIAssetData<AssetType.Sprite>>)
})

const selectedAnimation = computed(() => {
  if (sprite.value === undefined) {
    return null
  }
  return sprite.value.animations[0]
})
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>

