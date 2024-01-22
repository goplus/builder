<!--
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-12 17:28:28
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-18 11:19:32
 * @FilePath: /builder/spx-gui/src/components/sounds/SoundsEdit.vue
 * @Description: Sounds Edit Part
-->
<template>
  <div class="sound-edit-content">
    <div class="sound-edit-content-top">
      <span class="text-sound">
         <n-gradient-text type="danger">
           <div class="sounds-hint">| {{ $t('sounds.hint') }}</div>
         </n-gradient-text>
      </span>
      <n-input
          size="small"
          round
          placeholder="Meow Sound"
          class="sound-edit-content-top-input-sound-name"
      />
      <div class="sound-icon-container">
        <img class="sound-icon-with-text" src="@/assets/icon/sound/withdraw.svg"/>
        <div class="sound-icon-text">{{ $t('sounds.undo') }}</div>
      </div>
      <div class="sound-icon-container">
        <img class="sound-icon-with-text-flip-horizontal" src="@/assets/icon/sound/withdraw.svg"/>
        <div class="sound-icon-text">{{ $t('sounds.reUndo') }}</div>
      </div>
      <div class="sound-icon-container">
        <img class="sound-icon-with-text-rotate-left" src="@/assets/icon/sound/cut.svg"/>
        <div class="sound-icon-text">{{ $t('sounds.delete') }}</div>
      </div>
    </div>
    <div>
      <img style="width: 550px;" src="@/assets/image/sounds/sounds-edit-part.png">
    </div>
    <div class="sound-edit-content-bottom">

      <img class="sound-icon" src="@/assets/icon/sound/play.svg"/>

      <div class="sound-icon-container">
        <img class="sound-icon-with-text" src="@/assets/icon/sound/faster.svg"/>
        <div class="sound-icon-text">{{ $t('sounds.forward') }}</div>
      </div>
      <div class="sound-icon-container">
        <img class="sound-icon-with-text-flip-horizontal" src="@/assets/icon/sound/faster.svg"/>
        <div class="sound-icon-text">{{ $t('sounds.rewind') }}</div>
      </div>
      <div class="sound-icon-container">
        <img class="sound-icon-with-text-flip-horizontal" src="@/assets/icon/sound/mute.svg"/>
        <div class="sound-icon-text">{{ $t('sounds.mute') }}</div>
      </div>
      <div class="sound-icon-container">
        <img class="sound-icon-with-text-flip-horizontal" src="@/assets/icon/sound/volume.svg"/>
        <div class="sound-icon-text">{{ $t('sounds.volume') }}</div>
      </div>
      <div class="sound-icon-container">
        <img class="sound-icon-with-text-flip-horizontal" src="@/assets/icon/sound/replay.svg"/>
        <div class="sound-icon-text">{{ $t('sounds.replay') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { NInput, NGradientText } from "naive-ui";


</script>

<style scoped>

.sounds-hint {
  font-size: 30px;
}
.text-sound {
  margin-left: 5px;
  font-size: 30px;
}

.sound-edit-content-top {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 20px;
}

.sound-edit-content-top-input-sound-name {
  width: 225px;
  height: 36px;
}

.sound-edit-content-bottom {
  width: 20px;
  height: 20px;
  margin-top: 10px;
  display: flex;
  gap: 20px;
}


.sound-icon {
  width: 50px;
  height: 50px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.sound-icon:hover {
  transform: scale(1.1);
}

.sound-icon-container {
  font-size: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sound-icon-with-text-rotate-left,
.sound-icon-with-text-flip-horizontal,
.sound-icon-with-text {
  width: 40px;
  height: 40px;
  cursor: pointer;
}

.sound-icon-with-text-flip-horizontal {
  transform: scaleX(-1);
}

.sound-icon-with-text-rotate-left {
  transform: rotate(-90deg);
}



</style>
