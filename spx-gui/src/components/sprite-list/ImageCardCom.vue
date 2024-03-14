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
    <div class="delete-button" @click="deleteSprite(props.asset.name)">×</div>
    <n-image
      preview-disabled
      :width="computedProperties.imageWidth"
      :height="computedProperties.imageHeight"
      :src="computedProperties.spriteUrl"
      :fallback-src="error"
    />
    {{ props.asset.name }}
  </div>
  <div
    v-for="(scene, index) in computedProperties.backdropScenes"
    v-else
    :key="index"
    :class="computedProperties.cardClassName"
    :style="index == 0 ? firstBackdropStyle : ''"
    @click.stop="() => index === 0 || (scene.scene.name && setSceneToTop(scene.scene.name))"
  >
    <div
      class="delete-button"
      @click.stop="() => scene.scene.name && deleteBackdropScene(scene.scene.name)"
    >
      ×
    </div>
    <n-image
      preview-disabled
      :width="computedProperties.imageWidth"
      :height="computedProperties.imageHeight"
      :src="scene.file.url"
      :fallback-src="error"
    />
  </div>
</template>

<script setup lang="ts">
// ----------Import required packages / components-----------
import { defineProps, computed } from 'vue'
import { NImage } from 'naive-ui'
import { useSpriteStore } from '@/store/modules/sprite'
import { useBackdropStore } from '@/store/modules/backdrop'
import { AssetBase } from '@/class/asset-base'
import { Backdrop } from '@/class/backdrop'
import FileWithUrl from '@/class/file-with-url'
import error from '@/assets/image/library/error.svg'
import type { Scene } from '@/interface/file'

// ----------props & emit------------------------------------
interface PropType {
  type?: string
  asset: AssetBase | Backdrop
}
const props = defineProps<PropType>()
const spriteStore = useSpriteStore()
const backdropStore = useBackdropStore()
const firstBackdropStyle = { 'box-shadow': '0px 0px 0px 4px #FF81A7' }

// ----------computed properties-----------------------------
// Computed card style/ image width/ image height/ spriteUrl/ backdropFiles by props.type.
const computedProperties = computed(() => {
  const isBg = props.type === 'bg'
  const hasFiles = props.asset && props.asset.files && props.asset.files.length > 0
  return {
    cardClassName: isBg ? 'bg-list-card' : 'sprite-list-card',
    imageWidth: isBg ? 40 : 75,
    imageHeight: isBg ? 40 : 75,
    spriteUrl: !isBg && hasFiles ? props.asset.files[0].url : '',
    // current only support backdrop witch config of scene
    backdropScenes: (isBg && hasFiles && props.asset.config.scenes
      ? props.asset.config.scenes.map((scene: Scene, index: number) => ({
          scene: scene,
          file: props.asset.files[index]
        }))
      : []) as Array<{ scene: Scene; file: FileWithUrl }>
  }
})

// ----------methods-----------------------------------------
/**
 * @description: A Function about deleting sprite by name.
 * @param {*} name
 * @Author: Xu Ning
 * @Date: 2024-01-23 14:29:02
 */
const deleteSprite = (name: string) => {
  spriteStore.removeItemByName(name)
}

/**
 * @description: A Function about deleting backdrop's scene
 * @param {*} file
 * @Author: Xu Ning
 * @Date: 2024-01-24 12:11:38
 */
const deleteBackdropScene = (name: string) => {
  backdropStore.backdrop.removeScene(name)
}

/**
 * The first item of scenes is the backdrop of the project
 * @param name string
 */
const setSceneToTop = (name: string) => {
  backdropStore.backdrop.setSceneToTop(name)
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
