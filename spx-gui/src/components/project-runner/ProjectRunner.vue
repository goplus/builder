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
import {computed, type ComputedRef, ref} from 'vue'
import { useMessage } from "naive-ui";
import rawRunnerHtml from '@/assets/ispx/runner.html?raw'
import wasmExecUrl from '@/assets/ispx/wasm_exec.js?url'
import wasmUrl from '@/assets/ispx/main.wasm?url'

interface CustomWindow extends Window {
  startWithZipBuffer: (buf: ArrayBuffer | Uint8Array) => Promise<void>
}

const message = useMessage()
const props = defineProps<{ project: Project }>()
const iframe = ref<HTMLIFrameElement | null>(null)
const runnerWindow: ComputedRef<CustomWindow> = computed(() => iframe.value?.contentWindow as CustomWindow)

const handleIframeLoad = async () => {
  const runnerHtml = rawRunnerHtml
      .replace('/wasm_exec.js', wasmExecUrl)
      .replace('main.wasm', wasmUrl)
  console.log(runnerHtml)
  runnerWindow.value.document.write(runnerHtml)
  console.log('iframe mounted success')
}

const run = async () => {
  const zipResp = props.project.zip
  const buf = await (await zipResp).arrayBuffer()
  console.log(runnerWindow.value)
  if (typeof runnerWindow.value.startWithZipBuffer != "function"){
    message.warning('runner not ready')
    return
  }
  await runnerWindow.value.startWithZipBuffer(buf)
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
