<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-26 17:49:39
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-27 15:09:28
 * @FilePath: \builder\spx-gui\src\components\project-run-test\runnerWidget.vue
 * @Description: 
-->
<template>
  <!-- <input type="file" accept=".zip" @change="importFile" /> -->
  <button v-if="run" @click="onRun">run</button>
  <button v-else @click="onStop">stop</button>
  <div v-if="projectid">
    {{ props.projectid }} {{ run ? 'run' : 'stop' }}

    <!-- <projectRunTest ref="runner" :project="project"></projectRunTest> -->
  </div>
</template>
<script setup lang="ts">
import { Project, ProjectSource } from '@/class/project'
import { ref, nextTick, defineEmits, defineProps, watch } from 'vue'

const emits = defineEmits(['loadend'])
const props = defineProps<{ projectid: String }>()

const project = ref<Project>()
const runner = ref()
const run = ref(false)

watch(
  () => props.projectid,
  () => {
    console.log(props.projectid)
  },
  {
    immediate: true
  }
)

const onRun = () => {
  run.value = true
}
const onStop = () => {
  run.value = false
}
</script>
