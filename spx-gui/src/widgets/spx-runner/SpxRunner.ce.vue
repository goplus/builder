<!--
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-26 17:49:39
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-09 14:46:03
 * @FilePath: \builder\spx-gui\src\widgets\widget\spx-runner\SpxRunner.ce.vue
 * @Description: 
-->
<template>
  <div class="spx-runner-widget">
    <div class="operation">
      <button v-if="!run" :disabled="!ready || !!errorMsg" class="run" @click="onRun">run</button>
      <button v-else class="stop" @click="onStop">stop</button>
    </div>
    <div class="project-runner">
      <div v-if="errorMsg" class="error">
        <p>{{ errorMsg }}</p>
      </div>
      <div v-if="!ready && !errorMsg" class="loading">
        <p>loading...</p>
      </div>
      <div v-if="ready && !errorMsg" class="ready">
        <p>project ready</p>
        <p>{{ fullName(project.owner!, project.name!) }}</p>
      </div>

      <ProjectRunner ref="runner" :project="project" />
    </div>
  </div>
</template>
<script setup lang="ts">
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import { ref, watch } from 'vue'
import { Project, fullName } from '@/models/project'
import { shallowRef } from 'vue'
const props = defineProps<{ owner?: string; name?: string }>()
const runner = ref()
const run = ref(false)
const ready = ref(false)
const errorMsg = ref('')
const project = shallowRef(new Project())
watch(
  () => [props.owner, props.name],
  async ([owner, name]) => {
    if (owner && name) {
      ready.value = false
      errorMsg.value = ''
      try {
        const newProject = new Project()
        await newProject.loadFromCloud(owner, name, true)
        project.value.dispose()
        project.value = newProject
        ready.value = true
      } catch {
        errorMsg.value = 'loading project fail'
      } finally {
        ready.value = true
      }
    }
  },
  {
    immediate: true
  }
)

const onRun = () => {
  run.value = true
  runner.value.run()
}
const onStop = () => {
  run.value = false
  runner.value.stop()
}
</script>
<style lang="scss">
.spx-runner-widget {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid #77777789;
  border-radius: 10px;
  .operation {
    display: flex;
    justify-content: end;
    padding-top: 10px;
    padding-right: 10px;
    position: absolute;
    width: 100%;
    z-index: 100;
    button {
      border: 2px solid rgba(0, 20, 41, 0.4392156863);
      border-radius: 16px;
      z-index: 100;
      font-size: 14px;
      padding: 4px 14px;
      color: white;
      cursor: pointer;
      margin-right: 10px;
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      &.run {
        background-color: #3a8b3b;
      }
      &.stop {
        background-color: #d03050;
      }
    }
  }
  .project-runner {
    position: relative;
    width: 100%;
    flex: 1;
    height: 100%;
    iframe {
      width: 100%;
      height: 100%;
    }
    .loading,
    .ready,
    .error {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      & > p {
        text-align: center;
      }
    }
  }
}
</style>
