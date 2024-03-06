<template>
  <iframe ref="iframe" class="runner" frameborder="0" src="about:blank" />
</template>
<script setup lang="ts">
interface IframeWindow extends Window {
  startWithZipBuffer: (buf: ArrayBuffer | Uint8Array) => void
}

import { ref } from 'vue'
import rawRunnerHtml from '@/assets/ispx/runner.html?raw'
import wasmExecUrl from '@/assets/wasm_exec.js?url'
import wasmUrl from '@/assets/ispx/main.wasm?url'
import { watch } from 'vue'

const { zipData } = defineProps<{ zipData: ArrayBuffer | Uint8Array }>()

const iframe = ref<HTMLIFrameElement>()

watch(iframe, () => {
  const iframeWindow = iframe.value?.contentWindow as IframeWindow | null | undefined
  if (!iframeWindow) {
    return
  }
  const runnerHtml = rawRunnerHtml
    .replace('/wasm_exec.js', wasmExecUrl)
    .replace('main.wasm', wasmUrl)

  iframeWindow.document.write(runnerHtml) // This resets the iframe's content, including its window object

  iframeWindow.addEventListener('wasmReady', () => {
    iframeWindow.startWithZipBuffer(zipData)
  })
})
</script>
