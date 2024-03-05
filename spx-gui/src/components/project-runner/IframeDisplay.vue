<template>
  <iframe ref="iframe" class="runner" frameborder="0" src="about:blank" />
</template>
<script setup lang="ts">
interface IframeWindow extends Window {
  startWithZipBuffer: (buf: ArrayBuffer | Uint8Array) => void
}

import { ref, watchEffect } from 'vue'
import rawRunnerHtml from '@/assets/ispx/runner.html?raw'
import wasmExecUrl from '@/assets/ispx/wasm_exec.js?url'
import wasmUrl from '@/assets/ispx/main.wasm?url'

const { zipData } = defineProps<{ zipData: ArrayBuffer | Uint8Array }>()

const iframe = ref<HTMLIFrameElement>()

watchEffect(async () => {
  const iframeWindow = iframe.value?.contentWindow as IframeWindow | null | undefined
  if (!iframeWindow) {
    return
  }
  const runnerHtml = rawRunnerHtml
    .replace('/wasm_exec.js', wasmExecUrl)
    .replace('main.wasm', wasmUrl)

  iframeWindow.document.write(runnerHtml) // This resets the iframe's content, including its window object

  iframeWindow.addEventListener('wasmReady', () => {
    console.log('wasmReady')
    iframeWindow.startWithZipBuffer(zipData)
  })
})
</script>
