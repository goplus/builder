<template>
  <div v-show="props.active" class="sounds-details">Sounds details</div>
  <div v-show="!props.active" class="sounds-overview">Sounds overview</div>
</template>

<script setup lang="ts">
const props = defineProps<{
  active: boolean
}>()
</script>

<style scoped lang="scss">
.sounds-details {
}
.sounds-overview {
  width: 60px;
}
</style>
