<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { useBottomSticky } from '@/utils/dom'
import { useI18n } from '@/utils/i18n'
import { UICard, UICardHeader, UIEmpty } from '@/components/ui'
import type { RuntimeOutput } from '@/components/editor/runtime'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { CodeLink, textDocumentId2CodeFileName } from '../code-editor/spx-code-editor'

const i18n = useI18n()
const editorCtx = useEditorCtx()
const runtime = computed(() => editorCtx.state.runtime)
const outputs = computed(() => runtime.value.outputs)

const outputContainerRef = ref<HTMLElement | null>(null)
useBottomSticky(outputContainerRef)

function humanizeTime(time: number) {
  const d = dayjs(time)
  return d.format('HH:mm:ss.SSS')
}

function getOutputSourceLocation(output: RuntimeOutput) {
  if (output.source == null) return null
  return {
    file: output.source.textDocument,
    position: output.source.range.start
  }
}

function getOutputSourceLocationText(output: RuntimeOutput) {
  const location = getOutputSourceLocation(output)
  if (location == null) return ''
  const codeFileName = i18n.t(textDocumentId2CodeFileName(location.file))
  return `${codeFileName}:${location.position.line}`
}

const initializingError = computed(() => {
  if (runtime.value.running.mode !== 'debug') return null
  const err = runtime.value.running.initializingError
  if (err == null) return null
  return {
    time: Date.now(),
    message: ((err as any).message ?? err) + ''
  }
})
</script>

<template>
  <UICard
    class="flex flex-col"
    style="--console-panel-text-color: var(--ui-color-grey-1000); --console-panel-tip-color: var(--ui-color-grey-700)"
  >
    <UICardHeader>
      {{ $t({ en: 'Console', zh: '控制台' }) }}
    </UICardHeader>
    <ul ref="outputContainerRef" class="flex flex-[1_1_0] flex-col gap-1 overflow-y-auto p-3">
      <UIEmpty v-if="runtime.running.mode !== 'debug'" size="small">
        {{ $t({ en: 'Not running in debug mode', zh: '未处于调试模式' }) }}
      </UIEmpty>
      <UIEmpty v-else-if="runtime.running.initializing" size="small">
        {{ $t({ en: 'Initializing...', zh: '初始化中...' }) }}
      </UIEmpty>
      <li
        v-else-if="initializingError != null"
        class="relative font-code text-12"
        style="--console-panel-text-color: var(--ui-color-red-500); --console-panel-tip-color: var(--ui-color-red-300)"
      >
        <!-- TODO: Optimize initializing-error displaying here -->
        <span class="float-left mr-2 text-(--console-panel-tip-color)">
          {{ humanizeTime(initializingError.time) }}
        </span>
        <span class="whitespace-pre-line break-all text-(--console-panel-text-color)">
          {{ initializingError.message }}
        </span>
      </li>
      <UIEmpty v-else-if="outputs.length === 0" size="small">
        {{ $t({ en: 'No output', zh: '无输出' }) }}
      </UIEmpty>
      <li
        v-for="output in outputs"
        v-else
        :key="output.id"
        class="relative font-code text-12"
        :style="
          output.kind === 'error'
            ? {
                '--console-panel-text-color': 'var(--ui-color-red-500)',
                '--console-panel-tip-color': 'var(--ui-color-red-300)'
              }
            : null
        "
      >
        <span class="float-left mr-2 text-(--console-panel-tip-color)">{{ humanizeTime(output.time) }}</span>
        <CodeLink
          v-if="getOutputSourceLocation(output) != null"
          class="float-right ml-2 text-(--console-panel-tip-color)"
          v-bind="getOutputSourceLocation(output)!"
        >
          {{ getOutputSourceLocationText(output) }}
        </CodeLink>
        <span class="whitespace-pre-line break-all text-(--console-panel-text-color)">{{ output.message }}</span>
      </li>
    </ul>
  </UICard>
</template>
