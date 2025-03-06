<template>
  <div class="step-player"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { ListFilter } from '@/models/list-filter'
import type { Step } from '@/apis/guidance'

const props = defineProps<{
  step: Step
}>()

const emit = defineEmits<{
  stepCompleted: []
}>()

const filter = new ListFilter()

onMounted(() => {
  if (props.step.isApiControl) {
    filter.setFilter('apiReference', true, props.step.apis)
  }
  if (props.step.isAssetControl) {
    filter.setFilter('asset', true, props.step.assets)
  }
  if (props.step.isSpriteControl) {
    filter.setFilter('sprite', true, props.step.sprite)
  }
  if (props.step.isSoundControl) {
    filter.setFilter('sound', true, props.step.sound)
  }
  if (props.step.isCostumeControl) {
    filter.setFilter('costume', true, props.step.costume)
  }
  if (props.step.isAnimationControl) {
    filter.setFilter('animation', true, props.step.animation)
  }
  if (props.step.isWidgetControl) {
    filter.setFilter('widget', true, props.step.widget)
  }
  if (props.step.isBackdropControl) {
    filter.setFilter('backdrop', true, props.step.backdrop)
  }
})

onBeforeUnmount(() => {
  filter.reset()
})
</script>
