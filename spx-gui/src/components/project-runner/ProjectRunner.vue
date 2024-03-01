<!--
 * @Author: Hu JingJing
 * @Date: 2024-02-22 17:57:05
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-03-01 17:38:55
 * @Description: 
-->
<template>
  <div class="project-runner">
    <iframe ref="iframe" class="runner" frameborder="0" @load="handleIframeLoad" />
  </div>
</template>

<script lang="ts" setup>
import { Project } from '@/class/project'
import { ref } from 'vue'

interface CustomWindow extends Window {
  startWithZipBuffer: (buf: ArrayBuffer | Uint8Array) => Promise<void>
}

const props = defineProps<{ project: Project }>()

const iframe = ref<HTMLIFrameElement | null>(null)

const zipResp = props.project.zip

const handleIframeLoad = async () => {
  const runnerWindow = iframe.value?.contentWindow as CustomWindow
  runnerWindow.document.write(html)
  console.log(runnerWindow)

  const buf = await (await zipResp).arrayBuffer()
  console.log(typeof runnerWindow.startWithZipBuffer)
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

const html = `
<html>
<head>
    <meta charset="utf-8" />
    <script src="/wasm_exec.js"><\/script>
<script>
"use strict";

console.log('enter iframe')
let goRunPromiseResolve;
const goRunPromise = new Promise(resolve => {
  goRunPromiseResolve = resolve;
});

window.startWithZipBuffer = async (buffer) => {
  await goRunPromise;
  // For maybe a bug in Go WASM, we need to recreate an Uint8Array
  // in spite of the original type of \`buffer\` so that
  // the function can be called from out of iframe.
  const view = new Uint8Array(buffer);
  // goLoadData is injected in the Go code
  goLoadData(view);
}

(async () => {
  const go = new Go();
  const {instance} = await WebAssembly.instantiateStreaming(fetch("/main.wasm"), go.importObject)
  go.run(instance);
  goRunPromiseResolve();
})()
console.log('leave iframe')
<\/script>
<\/head>
<\/html>
`;

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
