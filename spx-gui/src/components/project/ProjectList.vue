<template>
  <NSpace v-if="isFetching" justify="center">
    <NSpin size="large" />
  </NSpace>
  <NSpace v-else-if="error != null" justify="center">
    {{ $t(error.userMessage) }}
    <button @click="refetch">{{ $t({ en: 'Refresh', zh: '刷新' }) }}</button>
  </NSpace>
  <ul v-else>
    <li
      v-for="project in projects?.data"
      :key="project.id"
      class="project-item"
      @click="() => emit('selected', project)"
    >
      {{ project.name }}
    </li>
  </ul>
  <NPagination v-if="pageCount > 1" v-model:page="pageIndex" :page-count="pageCount" />
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { NSpace, NSpin, NPagination } from 'naive-ui'
import { listProject, type ProjectData } from '@/apis/project'
import { useQuery } from '@/utils/exception'
import { computed } from 'vue'

const emit = defineEmits<{
  selected: [project: ProjectData]
}>()

const pageSize = 20
const pageIndex = ref(1)

const {
  isFetching,
  data: projects,
  error,
  refetch
} = useQuery(() => listProject({ pageSize, pageIndex: pageIndex.value }), {
  en: 'Failed to list project',
  zh: '获取项目列表失败'
})

const pageCount = computed(() => {
  const total = projects.value?.total ?? 0
  return Math.ceil(total / pageSize)
})
</script>

<style lang="scss" scoped>
.project-item {
  cursor: pointer;
}
</style>
