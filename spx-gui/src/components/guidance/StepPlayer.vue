<template>
  <div class="step-player"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { ListFilter } from '@/models/list-filter'
import { Step } from '@/components/guidance/common/types'

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
  // ... same logic for other types of steps
})

onBeforeUnmount(() => {
  filter.reset()
})
</script>
