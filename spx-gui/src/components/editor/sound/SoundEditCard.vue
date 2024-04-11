<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:28:15
 * @LastEditors: Yao xinyue
 * @LastEditTime: 2024-02-18 14:11:19
 * @FilePath: src/components/sound/SoundEditCard.vue
 * @Description: Sounds Card
-->
<template>
  <div class="sounds-card">
    <div class="delete-button" @click.stop="onRemove">×</div>
    <div class="sounds-card-waveform"></div>
    <div class="sounds-card-content">
      <div class="sounds-card-title">
        {{ props.asset.name }}
      </div>
      <div class="sounds-card-subtitle"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import { Sound } from '@/models/sound'

const props = defineProps<{ asset: Sound }>()

const emits = defineEmits<{
  remove: []
}>()

const onRemove = () => {
  emits('remove')
}
</script>

<style scoped lang="scss">
.sounds-card {
  margin-top: 10px;

  width: 120px;
  height: 120px;
  border-radius: 20px;
  border: 1px solid #fff;
  box-shadow: 0 0 5px rgb(220, 79, 35);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: visible; // show x button

  cursor: pointer;

  transition: transform 0.3s ease;
  &:hover {
    transform: scale(1.04);
  }
}

.sounds-card-waveform {
  margin-top: 20px;
  height: 70%;
  width: 100%;
  background: url('./audio-card-wave.png') no-repeat center center;
  background-size: cover;
}

.sounds-card-title {
  font-size: 20px;
}

.sounds-card-subtitle {
  font-size: 14px;
  margin: 0;
}

.sounds-card-content {
  padding: 6px;
  width: 90%;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.delete-button {
  position: absolute;
  top: -5px;
  right: -10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 40px;
  border: 2px solid #000;
}

.delete-button:hover {
  transform: scale(1.1);
  background-color: #f8f2f2;
}
</style>
