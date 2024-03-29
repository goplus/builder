<template>
  <div v-show="props.active" class="sprites-details">
    <SpriteList></SpriteList>
  </div>
  <div v-show="!props.active" class="sprites-overview">Sprites overview</div>
</template>

<script setup lang="ts">
import SpriteList from './SpriteList.vue'
const props = defineProps<{
  active: boolean
}>()
</script>

<style scoped lang="scss">
.sprites-details {
}
.sprites-overview {
  width: 60px;
}
</style>
