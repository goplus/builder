<!-- eslint-disable vue/multi-word-component-names -->
<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-24 15:48:38
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-22 23:14:57
 * @FilePath: \spx-gui\src\components\stage-viewer\Sprite.vue
 * @Description: 
-->
<template>
  <Costume
    :spriteConfig="props.spriteConfig"
    :selected="props.selected"
    :mapConfig="props.mapConfig"
  >
  </Costume>
  
</template>
<script lang="ts" setup>
import Costume from './Costume.vue'
import { defineProps, computed, defineEmits, type ComputedRef } from 'vue'
import type { StageSprite, StageCostume, MapConfig, SpriteDragEndTarget } from '.'
import type { Sprite as SpriteConfig } from '@/class/sprite'
// ----------props & emit------------------------------------
const props = defineProps<{
spriteConfig: SpriteConfig
mapConfig: MapConfig
selected: boolean
}>()
</script>
