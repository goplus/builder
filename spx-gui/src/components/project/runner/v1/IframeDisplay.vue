<template>
  <iframe ref="iframe" class="iframe" frameborder="0" src="about:blank" />
</template>

<script lang="ts">
import { ref, watch } from 'vue'
import wasmExecUrl from '@/assets/wasm/wasm_exec.js?url'
import ispxWasmUrl from '@/assets/wasm/ispx.wasm?url'
import ispxRunnerHtml from './ispx/runner.html?raw'
import { addPrefetchLink } from '@/utils/dom'

// preload resources (for example, wasm files) to accelerate the loading
export function preload() {
  // Use `<link rel=prefetch>` instead of `<link rel=preload>`:
  // * `preload` indicates higher priority than `prefetch`. Preloaded content are expected to be used soon. For example, chrome will warn if the preloaded content is not used within 3 or 5 seconds. While project here will not be runned until the user clicks some "run" button.
  // * `preload` results are not shared across different documents, while the iframe content is a different document. The "preloading" is meaningful only when the HTTP cache is shared, which is more like the case of `prefetch`.
  addPrefetchLink(wasmExecUrl)
  addPrefetchLink(ispxWasmUrl)
}
</script>

<script setup lang="ts">
const emit = defineEmits<{
  console: [type: 'log' | 'warn', args: unknown[]]
  loaded: []
}>()

interface IframeWindow extends Window {
  startWithZipBuffer: (buf: ArrayBuffer | Uint8Array) => void
  console: typeof console
}

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
  const runnerHtml = ispxRunnerHtml.replace('/wasm_exec.js', wasmExecUrl).replace('ispx.wasm', ispxWasmUrl)

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
