<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:28:15
 * @LastEditors: Yao xinyue
 * @LastEditTime: 2024-01-12 17:28:15
 * @FilePath: src/components/sounds/SoundsEditCard.vue
 * @Description: Sounds Card
-->
<template>
  <div class="sounds-card">
    <div class="close-button">×</div>
    <div class="sounds-card-waveform">
    </div>
    <div class="sounds-card-content">
      <div class="sounds-card-title">
        {{ props.asset.name }}
      </div>
      <div class="sounds-card-subtitle">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { type Asset } from "@/interface/library";
import { defineProps } from "vue";

const props = defineProps({
  asset: {
    type: Object as () => Asset,
    required: true,
  },
});

</script>

<style scoped lang="scss">
@import "@/assets/theme.scss";

.sounds-card {
  margin-top: 10px;

  width: 120px;
  height: 120px;
  border-radius: 20px;
  background: linear-gradient(145deg, $sounds-edit-card-1, $sounds-edit-card-2);
  box-shadow: 0 0 5px rgb(220, 79, 35);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: visible;  // show x button

  cursor: pointer;

  transition: transform 0.3s ease;
  &:hover {
    transform: scale(1.08);
  }
}

.sounds-card-waveform {
  margin-top: 20px;
  height: 70%;
  width: 100%;
  background: url('../../assets/image/sounds/audio-card-wave.png') no-repeat center center;
  background-size: cover;
}

.sounds-card-title {
  font-size: 20px;
  color: $sounds-edit-card-title;
}

.sounds-card-subtitle {
  font-size: 14px;
  color: $sounds-edit-card-subtitle;
  margin: 0;
}

.sounds-card-content {
  padding: 6px;
  background: linear-gradient(145deg, $sounds-edit-card-content-1, $sounds-edit-card-content-2);
  width: 90%;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.close-button {
  position: absolute;
  top: -5px;
  right: -10px;
  background-color: $sounds-edit-card-close-button;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  font-size: 40px;
  color: $sounds-edit-card-close-button-x;
  border: 2px solid $sounds-edit-card-close-button-border;
}

</style>
