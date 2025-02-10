路由跳转：

- 输入：path: '/storyline/:storyLineId'

## 组件定义

```vue
type Props = {
  title: string
  description: string
  story: Story
  levels: Level[]
  achievements: Achievement
}
```

## 伪代码

```vue
<template>
  <div class="storyLine">
    <div class="title">
      {{ storyLine.levelTitle }}
    </div>
    <div class="level-area">
      <div
          v-for="(level, index) in levels"
          :key="index"
          class="level"
          @click="toLevel(level.id)"
      >
        // 渲染相关信息
      </div>
    </div>

    <div class="achievement-area">
      <div
          v-for="(achievement, index) in achievements"
          :key="index"
          class="achievement"
      >
        //渲染相关信息
      </div>
    </div>
    <div class="description">
      {{ storyLine.levelDescription }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import { defineProps, ref, onMounted } from 'vue'
  import axios from 'axios'
  import { useRouter } from 'vue-router'

  // 假设的类型定义
  interface StoryLine {
    backgroundImage: string;
    title: string;
    description: string;
  }

  interface Level {
    levelId: number;
    index: number;
    cover: string;				// 封面
    coordinate: number[]; // 在界面上的位置信息
    levelTitle: string;
    levelDescription: string;
    status: number;
    achievements: Achievement[];
  }

  interface Achievement {
    icon: string;
    infoText: string;
    status: number;
  }

  interface StoryLineData {
    storyLine: StoryLine;
    levels: Level[];
  }

  const props = defineProps<{
    storyLineId: number;
  }>()

  const description = ref<string>('')
  const storyLine = ref<StoryLine>()
  const levels = ref<Level[]>([])
  const achievements = ref<Achievement[]>([])
  const router = useRouter()

  const fetchStoryLineData = async () => {
    try {
      const response = await axios.get<StoryLineData>(`/guidance/storyLine/getByUser/{userId}/{props.storyLineId}`)
      const data = response.data
      storyLine.value = data.storyLine
      levels.value = data.levels
      achievements.value = levels.achievements
    } catch (error) {
      console.error('Failed to fetch story line data:', error)
    }
  }

  onMounted(() => {
    fetchStoryLineData()
  })

  const toLevel = (levelId: number) => {
    router.push(`/level/${levelId}`)
  }
</script>
```