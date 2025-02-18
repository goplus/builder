## 伪代码

```vue

<script setup lang="ts">
  import { defineProps, ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';

  // 定义 props
  const props = defineProps<{
    storyLineId: string;
  }>();

  // 定义响应式变量
  const storyLine = ref<StoryLine | null>(null);
  const userStoryLineRelationship = ref<UserStoryLineRelationship | null>(null);
  const router = useRouter();

  // 获取故事线数据
  const init = async () => {
    try {
      const data = await backend.GetStoryLine(props.storyLineId);
      storyLine.value = data;
      userStoryLineRelationship.value = await backend.GetUserStoryLineRelationShip(props.storyLineId) // 若是第一次进入，则会新建用户和故事线的关系
    } catch (error) {
      console.error('Failed to init storyLine:', error);
    }
  };

  // 组件挂载时调用
  onMounted(() => {
    init();
  });

  // 跳转到关卡页面
  const toLevel = (levelIndex: number) => {
    if (!storyLine.value) {
      console.error('Story line data is not loaded yet.');
      return;
    }

    // 动态生成路径
    router.push({
      path: `/editor/${storyLine.value.name}`,
      query: {
        guide: true,
        storyLineId: storyLine.value.id, // 使用故事线的 id
        levelIndex: levelIndex, // 使用关卡下标
      },
    });
  };
</script>
```