<template>
  <iframe ref="iframe" class="iframe" frameborder="0" src="about:blank" />
</template>

<script lang="ts">
import { ref, watch } from 'vue'
import rawRunnerHtml from '@/assets/ispx/runner.html?raw'
import wasmExecUrl from '@/assets/wasm_exec.js?url'
import wasmUrl from '@/assets/ispx/main.wasm?url'

// Patch for type declaration of fetch priority
// TODO: upgrade typescript & related development tools, then remove the patch
declare global {
  interface HTMLLinkElement {
    /**
     * An optional string representing a hint given to the browser on how it should prioritize fetching of a preload relative to other resources of the same type.
     * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLinkElement/fetchPriority)
     */
    fetchPriority?: 'low' | 'high' | 'auto'
  }
}

function addPreloadLink(type: 'fetch' | 'script', url: string) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = type
  link.href = url
  link.fetchPriority = 'low'
  document.head.appendChild(link)
}

// preload resources (for example, wasm files) to accelerate the loading
export function preload() {
  addPreloadLink('script', wasmExecUrl)
  addPreloadLink('fetch', wasmUrl)
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
