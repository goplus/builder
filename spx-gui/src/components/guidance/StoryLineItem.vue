<template>
  <li class="storyline-item">
    <RouterLink class="link" :to="to">
      <div class="background-image" :style="{ backgroundImage: `url(${storyline.backgroundImage})` }"></div>
      <div class="info">
        <div class="title">
          {{ $t(storyline.title) }}
        </div>
        <div class="description">
          <p>{{ $t(storyline.description) }}</p>
        </div>
      </div>
    </RouterLink>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StoryLine } from '@/apis/guidance'
import { getStoryLineRoute } from '@/router'
const props = defineProps<{
  storyline: StoryLine
}>()

const to = computed(() => {
  const { id } = props.storyline
  return getStoryLineRoute(id)
})
</script>

<style scoped lang="scss">
.storyline-item {
  width: 232px;
  height: 210px;
  overflow: hidden;
  border-radius: var(--ui-border-radius-2);
  border: 1px solid var(--ui-color-grey-400);
  transition: 0.1s;
  &:hover {
    box-shadow: 0px 4px 12px 0px rgba(36, 41, 47, 0.08);
  }
  .background-image {
    width: 100%;
    aspect-ratio: 16/9;
    background-repeat: no-repeat;
    background-size: cover;
  }
  .info {
    padding: 10px;
    .title {
      font-size: 16px;
    }
    .description {
      font-size: 12px;
      p {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
        margin: 0;
      }
    }
  }
}
.link {
  text-decoration: none;
  color: inherit;
}
</style>
