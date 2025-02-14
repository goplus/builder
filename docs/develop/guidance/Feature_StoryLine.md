## 伪代码

```vue
<script setup lang="ts">
  import { defineProps, ref, onMounted } from 'vue'
  import axios from 'axios'
  import { useRouter } from 'vue-router'
  

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
  
  // 当在故事线页面点击某一关卡时调用
  const toLevel = (levelId: number) => {
    router.push(`/level/${levelId}`)
  }
</script>
```