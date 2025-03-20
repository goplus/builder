<template>
  <CenteredWrapper class="main">
    <StoryLinesSection :query-ret="easyStoryLines" :num-in-row="numInRow" icon-color="green">
      <template #title>
        {{
          $t({
            en: 'Easy',
            zh: '入门课程'
          })
        }}
      </template>
      <StoryLineItem v-for="storyLine in easyStoryLines.data.value" :key="storyLine.id" :storyline="storyLine" />
    </StoryLinesSection>
    <StoryLinesSection :query-ret="mediumStoryLines" :num-in-row="numInRow" icon-color="blue">
      <template #title>
        {{
          $t({
            en: 'Medium',
            zh: '中级课程'
          })
        }}
      </template>
      <StoryLineItem v-for="storyLine in mediumStoryLines.data.value" :key="storyLine.id" :storyline="storyLine" />
    </StoryLinesSection>
    <StoryLinesSection :query-ret="hardStoryLines" :num-in-row="numInRow" icon-color="red">
      <template #title>
        {{
          $t({
            en: 'Hard',
            zh: '高级课程'
          })
        }}
      </template>
      <StoryLineItem v-for="storyLine in hardStoryLines.data.value" :key="storyLine.id" :storyline="storyLine" />
    </StoryLinesSection>
  </CenteredWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import StoryLinesSection from '@/components/guidance/StoryLineSection.vue'
import StoryLineItem from '@/components/guidance/StoryLineItem.vue'
import { useQuery } from '@/utils/query'
import { listStoryLine } from '@/apis/guidance'
import { useResponsive } from '@/components/ui'
import { usePageTitle } from '@/utils/utils'
usePageTitle({
  en: 'Courses',
  zh: '课程'
})

const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))

const easyStoryLines = useQuery(
  async () => {
    const { data: storyLines } = await listStoryLine('easy')
    return storyLines
  },
  {
    en: 'Failed to load easy courses',
    zh: '加载入门课程失败'
  }
)
const mediumStoryLines = useQuery(
  async () => {
    const { data: storyLines } = await listStoryLine('medium')
    return storyLines
  },
  {
    en: 'Failed to load medium courses',
    zh: '加载中级课程失败'
  }
)
const hardStoryLines = useQuery(
  async () => {
    const { data: storyLines } = await listStoryLine('hard')
    return storyLines
  },
  {
    en: 'Failed to load hard courses',
    zh: '加载高级课程失败'
  }
)
</script>

<style lang="scss" scoped>
.main {
  padding-top: 10px;
}
</style>
