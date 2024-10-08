<template>
  <RunnerContainer v-if="project != null" mode="share" :project="project" />
  <UILoading :visible="project == null" cover />
</template>

<script setup lang="ts">
import { useAsyncComputed } from '@/utils/utils'
import { Project } from '@/models/project'
import RunnerContainer from '@/components/project/runner/RunnerContainer.vue'
import { UILoading } from '@/components/ui'

const props = defineProps<{
  owner: string
  name: string
}>()

const project = useAsyncComputed(async () => {
  const p = new Project()
  await p.loadFromCloud(props.owner, props.name)
  return p
})
</script>
