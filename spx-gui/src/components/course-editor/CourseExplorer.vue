<script lang="ts">
const nodeClass =
  'w-full rounded px-2 py-1 text-left text-sm border-none bg-transparent cursor-pointer hover:bg-grey-400 truncate'
const activeNodeClass = 'bg-primary-100 text-primary-main hover:bg-primary-100'
</script>

<script setup lang="ts">
import type { TutorialProject } from '@/models/tutorial/project'
import type { CourseDoc } from './route'

const props = defineProps<{
  project: TutorialProject
  doc: CourseDoc
}>()

const emit = defineEmits<{
  select: [doc: CourseDoc]
}>()

function isActive(type: CourseDoc['type'], videoName: string | null = null) {
  const doc = props.doc
  if (doc.type !== type) return false
  return doc.type === 'videos' ? doc.name === videoName : true
}
</script>

<template>
  <nav
    v-radar="{
      name: 'Course explorer',
      desc: 'Tree of the course documents: info, program, videos and the embedded project'
    }"
    class="flex h-full flex-col gap-0.5 overflow-y-auto p-2"
  >
    <div class="px-2 py-1 text-xs font-semibold uppercase text-grey-700">{{ $t({ en: 'Course', zh: '课程' }) }}</div>
    <button
      v-radar="{ name: 'Course info node', desc: 'Click to edit course title, thumbnail and Copilot context' }"
      :class="[nodeClass, isActive('info') && activeNodeClass]"
      @click="emit('select', { type: 'info' })"
    >
      {{ $t({ en: 'Course info', zh: '课程信息' }) }}
    </button>
    <button
      v-radar="{ name: 'Course program node', desc: 'Click to edit the course program main_course.gox' }"
      :class="[nodeClass, isActive('program') && activeNodeClass]"
      @click="emit('select', { type: 'program' })"
    >
      {{ $t({ en: 'Course program', zh: '课程程序' }) }} <code class="text-xs">main_course.gox</code>
    </button>
    <button
      v-radar="{ name: 'Videos node', desc: 'Click to manage course videos' }"
      :class="[nodeClass, isActive('videos', null) && activeNodeClass]"
      @click="emit('select', { type: 'videos', name: null })"
    >
      {{ $t({ en: 'Videos', zh: '视频' }) }} <span class="text-xs text-grey-700">({{ project.videos.length }})</span>
    </button>
    <ul class="m-0 list-none pl-4">
      <li v-for="video in project.videos" :key="video.id">
        <button
          v-radar="{ name: `Video node ${video.name}`, desc: 'Click to open this video' }"
          :class="[nodeClass, isActive('videos', video.name) && activeNodeClass]"
          :title="video.name"
          @click="emit('select', { type: 'videos', name: video.name })"
        >
          {{ video.name }}
        </button>
      </li>
    </ul>
    <button
      v-radar="{ name: 'Project node', desc: 'Click to edit the embedded learner project in the Project Editor' }"
      :class="[nodeClass, isActive('project') && activeNodeClass]"
      @click="emit('select', { type: 'project', inEditorPath: [] })"
    >
      {{ $t({ en: 'Project', zh: '工程' }) }} <span class="text-xs text-grey-700">spx</span>
    </button>
  </nav>
</template>
