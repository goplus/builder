<script setup lang="ts">
import type { TutorialCard } from '@prototype/data/tutorials'

defineProps<{
  tutorial: TutorialCard
}>()

defineEmits<{
  select: [tutorial: TutorialCard]
}>()
</script>

<template>
  <li>
    <button
      class="course-series-card"
      type="button"
      @click="$emit('select', tutorial)"
    >
      <div class="card-image" aria-hidden="true">
        <img src="@prototype/assets/map-bg.png" alt="" />
      </div>
      <div class="card-info">
        <h2>{{ tutorial.title }}</h2>
        <div class="card-meta">
          <span>{{ tutorial.total }}</span>
          <span>{{ tutorial.updatedAt }}</span>
        </div>
      </div>
    </button>
  </li>
</template>
