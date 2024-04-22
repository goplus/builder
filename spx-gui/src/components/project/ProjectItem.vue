<template>
  <li class="project-item">
    <div class="img-box">
      <div class="img" :style="imgStyle"></div>
    </div>
    <div class="info">
      <p class="name">{{ props.project.name }}</p>
      <p class="creation-time">{{ creationTime }}</p>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { Project } from '@/models/project'
import dayjs from 'dayjs'
import defaultProjectSvg from './icons/default-project.svg'

const props = defineProps<{
  project: Project
}>()

const imgSrc = useFileUrl(() => props.project.sprites[0]?.costume?.img)

const imgStyle = computed(() => {
  const backgroundImage = imgSrc.value || defaultProjectSvg
  return { backgroundImage: `url("${backgroundImage}")` }
})

const creationTime = computed(() => dayjs(props.project.cTime!).format('YYYY.MM.DD HH:mm'))
</script>

<style lang="scss" scoped>
.project-item {
  width: 168px;
  overflow: hidden;
  cursor: pointer;
  border-radius: var(--ui-border-radius-2);
  background-color: var(--ui-color-grey-200);
}

.img-box {
  aspect-ratio: 4 / 3;
  padding: 4px;

  .img {
    width: 100%;
    height: 100%;
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
  }
}

.info {
  padding: 8px 12px;
  background-color: var(--ui-color-grey-300);
}

.name {
  font-size: 14px;
  line-height: 22px;
  color: var(--ui-color-grey-1000);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.creation-time {
  font-size: 10px;
  line-height: 18px;
  color: var(--ui-color-grey-800);
}
</style>
