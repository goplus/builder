## 伪代码

```vue

<script setup lang="ts">
  import { defineProps, ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { LocaleMessage } from './index';

  interface StoryLine {
    id: string;
    backgroundImage: string;            // 故事线的背景图url
    name: string                 		// 故事线的名字
    title: LocaleMessage;               // 故事线标题
    description: LocaleMessage;         // 故事线描述
    tag: 'easy' | 'medium' | 'hard';    // 故事线难度标签
    levels: Level[];
  }

  // 定义 props
  const props = defineProps<{
    storyLineId: string;
    userName: string
  }>();

  // 定义响应式变量
  const storyLine = ref<StoryLine | null>(null);
  const router = useRouter();

  // 获取故事线数据
  const init = async () => {
    try {
      const data = await backend.getStoryLine(props.storyLineId);
      storyLine.value = data;
      await backend.CreateUserStoryLineRelationShip(storyLine.value.name, props.userName)
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