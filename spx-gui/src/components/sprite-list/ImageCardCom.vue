<!--
 * @Author: Xu Ning
 * @Date: 2024-01-18 17:11:19
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-13 12:21:45
 * @FilePath: \spx-gui\src\components\sprite-list\ImageCardCom.vue
 * @Description:
-->
<template>
  <div v-if="props.type === 'sprite'" :class="computedProperties.cardClassName">
    <div class="delete-button" @click="deleteSprite(props.asset as Sprite)">×</div>
    <n-image
      preview-disabled
      :width="computedProperties.imageWidth"
      :height="computedProperties.imageHeight"
      :src="spriteUrl"
      :fallback-src="error"
    />
    {{ (props.asset as Sprite).name }}
  </div>
  <div
    v-for="(backdrop, index) in backdrops"
    v-else
    :key="index"
    :class="computedProperties.cardClassName"
    :style="index == 0 ? firstBackdropStyle : ''"
    @click.stop="() => topBackdrop(backdrop.name)"
  >
    <div
      class="delete-button"
      @click.stop="() => deleteBackdrop(backdrop.name)"
    >
      ×
    </div>
    <n-image
      preview-disabled
      :width="computedProperties.imageWidth"
      :height="computedProperties.imageHeight"
      :src="backdrop.url"
      :fallback-src="error"
    />
  </div>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineProps, computed } from 'vue'
import { NImage } from 'naive-ui'
import { Stage } from '@/models/stage'
import type { Sprite } from '@/models/sprite'
import error from '@/assets/image/library/error.svg'
import { useProjectStore } from '@/store'
import { ref } from 'vue'
import { effect } from 'vue'

// ----------props & emit------------------------------------
interface PropType {
  type: 'sprite' | 'bg' // TODO: split the component
  asset: Sprite | Stage
}
const props = defineProps<PropType>()
const projectStore = useProjectStore()
const firstBackdropStyle = { 'box-shadow': '0px 0px 0px 4px #FF81A7' }

// ----------computed properties-----------------------------
const computedProperties = computed(() => {
  if (props.type === 'bg') {
    return {
      cardClassName: 'bg-list-card',
      imageWidth: 40,
      imageHeight: 40
    }
  }
  return {
    cardClassName: 'sprite-list-card',
    imageWidth: 75,
    imageHeight: 75
  }
})

const spriteUrl = ref('')
const backdrops = ref<Array<{ name: string, url: string }>>([])

effect(async () => {
  if (props.type === 'bg') {
    backdrops.value = await Promise.all((props.asset as Stage).backdrops.map(async backdrop => {
      const url = await backdrop.img.url()
      return { name: backdrop.name, url }
    }))
  } else {
    // TODO: use costume index instead of the 1st costume
    spriteUrl.value = await (props.asset as Sprite).costumes[0].img.url()
  }
})

// ----------methods-----------------------------------------
const deleteSprite = (sprite: Sprite) => {
  projectStore.project.removeSprite(sprite.name)
}

const deleteBackdrop = (name: string) => {
  projectStore.project.stage.removeBackdrop(name)
}

const topBackdrop = (name: string) => {
  projectStore.project.stage.topBackdrop(name)
}
</script>

<style scoped lang="scss">
@import '@/assets/theme.scss';

@mixin listCardBase {
  margin: 10px auto;
  border-radius: 20px;
  box-shadow: 0 0 5px $sprite-list-card-box-shadow;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: visible; // show x button
  cursor: pointer;

  .delete-button {
    position: absolute;
    top: -5px;
    right: -10px;
    background-color: $sprite-list-card-close-button;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    color: $sprite-list-card-close-button-x;
    border: 2px solid $sprite-list-card-close-button-border;
  }
}

.bg-list-card {
  @include listCardBase;
  width: 60px;
  height: 60px;

  .delete-button {
    width: 15px;
    height: 15px;
    font-size: 20px;
  }
}

.sprite-list-card {
  @include listCardBase;
  width: 110px;
  height: 110px;

  .delete-button {
    width: 30px;
    height: 30px;
    font-size: 40px;
  }
}
</style>
