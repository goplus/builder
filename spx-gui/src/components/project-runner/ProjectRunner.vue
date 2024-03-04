<!--
 * @Author: Hu JingJing
 * @Date: 2024-02-22 17:57:05
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-03-01 17:38:55
 * @Description: 
-->
<template>
  <div class="project-runner">
    <iframe ref="iframe" class="runner" frameborder="0" @load="handleIframeLoad"/>
  </div>
</template>

<script lang="ts" setup>
import { Project } from '@/class/project'
import { ref } from 'vue'
import rawRunnerHtml from '@/assets/ispx/runner.html?raw'
import wasmExecUrl from '@/assets/ispx/wasm_exec.js?url'
import wasmUrl from '@/assets/ispx/main.wasm?url'

interface CustomWindow extends Window {
  startWithZipBuffer: (buf: ArrayBuffer | Uint8Array) => Promise<void>
}

const props = defineProps<{ project: Project }>()

const iframe = ref<HTMLIFrameElement | null>(null)

const zipResp = props.project.zip

const handleIframeLoad = async () => {
  const runnerWindow = iframe.value?.contentWindow as CustomWindow
  const runnerHtml = rawRunnerHtml
      .replace('/wasm_exec.js', wasmExecUrl)
      .replace('main.wasm', wasmUrl)
  console.log(runnerHtml)
  runnerWindow.document.write(runnerHtml)

  const buf = await (await zipResp).arrayBuffer()
  await runnerWindow.startWithZipBuffer(buf)
}

const run = async () => {
  props.project.run()
  console.log('project run success')
}

const stop = async () => {
  if (iframe.value) {
    iframe.value.src = ''
  }
}

defineExpose({
  run,
  stop
})
</script>

<style lang="scss" scoped>
.project-runner {
  flex: 1;
  text-align: center;
}

.runner {
  width: 100%;
  height: 100%;
}
</style>
