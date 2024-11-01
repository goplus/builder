<template>
  <iframe ref="iframe" class="iframe" frameborder="0" src="about:blank" />
</template>
<script setup lang="ts">
const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
  loaded: []
}>()

interface IframeWindow extends Window {
  startWithZipBuffer: (buf: ArrayBuffer | Uint8Array) => void
  console: typeof console
}

import { ref } from 'vue'
import rawRunnerHtml from '@/assets/ispx/runner.html?raw'
import wasmExecUrl from '@/assets/wasm_exec.js?url'
import wasmUrl from '@/assets/ispx/main.wasm?url'
import { watch } from 'vue'

const props = defineProps<{ zipData: ArrayBuffer | Uint8Array }>()

const iframe = ref<HTMLIFrameElement>()

watch(iframe, () => {
  if (!iframe.value) {
    return
  }
  const iframeWindow = iframe.value.contentWindow as IframeWindow | null
  if (!iframeWindow) {
    return
  }
  const runnerHtml = rawRunnerHtml.replace('/wasm_exec.js', wasmExecUrl).replace('main.wasm', wasmUrl)

  iframeWindow.document.write(runnerHtml) // This resets the iframe's content, including its window object

  iframeWindow.addEventListener('wasmReady', () => {
    iframeWindow.startWithZipBuffer(props.zipData)
    const canvas = iframeWindow.document.querySelector('canvas')
    if (canvas == null) throw new Error('canvas expected in iframe')
    canvas.focus() // focus to canvas by default, so the user can interact with the game immediately
    emit('loaded')
  })
  iframeWindow.console.log = function (...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.log(...args)
    emit('console', 'log', args)
  }
  iframeWindow.console.warn = function (...args: unknown[]) {
    console.warn(...args)
    emit('console', 'warn', args)
  }
})
</script>

<style scoped lang="scss">
.iframe {
  width: 100%;
  height: 100%;
}
</style>
