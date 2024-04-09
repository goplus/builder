<template>
  <li class="sprite-item" :class="{ active: props.active }">
    <div class="img" :style="imgStyle"></div>
    <p class="name">{{ props.sprite.name }}</p>
    <button class="remove" @click.stop="emit('remove')">X</button>
  </li>
</template>

<script setup lang="ts">
import { ref, effect, computed } from 'vue'
import { Sprite } from '@/models/sprite'

const props = defineProps<{
  sprite: Sprite
  active: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()

const imgSrc = ref<string | null>(null)

effect(async () => {
  const img = props.sprite.costume?.img
  imgSrc.value = img != null ? await img.url() : null // TODO: race condition
})

const imgStyle = computed(() => imgSrc.value && { backgroundImage: `url("${imgSrc.value}")` })
</script>

<style lang="scss" scoped>
.sprite-item {
  display: flex;
  flex-direction: column;
  width: 80px;
  height: fit-content;
  padding: 6px;
  position: relative;
  align-items: center;
  border: 1px solid #333;

  &.active {
    border-color: yellow;
    background-color: yellow;
  }
}

.img {
  width: 100%;
  height: 68px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.name {
  margin: 4px 0 0;
}

.remove {
  position: absolute;
  top: -5px;
  right: -5px;
}
</style>
