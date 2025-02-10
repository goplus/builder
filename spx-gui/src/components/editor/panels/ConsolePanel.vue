<script setup lang="ts">
import { throttle } from 'lodash'
import dayjs from 'dayjs'
import { computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import type { RuntimeOutput } from '@/models/runtime'
import { UICard, UICardHeader, UIEmpty } from '@/components/ui'
import { useEditorCtx } from '../EditorContextProvider.vue'
import CodeLink from '../code-editor/CodeLink.vue'
import { textDocumentId2CodeFileName } from '../code-editor/common'

const i18n = useI18n()
const editorCtx = useEditorCtx()
const runtime = computed(() => editorCtx.runtime)

let isScrolledToBottom = true

const handleScroll = throttle((e: Event) => {
  const el = e.target as HTMLElement
  isScrolledToBottom = el.scrollHeight - el.scrollTop === el.clientHeight
}, 50)

function handleOutput(outputEl: unknown, i: number) {
  if (i !== runtime.value.outputs.length - 1) return
  if (!isScrolledToBottom) return
  if (outputEl == null) return
  ;(outputEl as HTMLElement).scrollIntoView({ behavior: 'instant' })
}

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
</script>

<template>
  <UICard class="console-panel">
    <UICardHeader>
      {{ $t({ en: 'Console', zh: '控制台' }) }}
    </UICardHeader>
    <ul class="output-container" @scroll="handleScroll">
      <UIEmpty v-if="runtime.outputs.length === 0" size="small">
        <template v-if="runtime.running.mode === 'debug' && runtime.running.initializing">
          {{ $t({ en: 'Initializing...', zh: '初始化中...' }) }}
        </template>
        <template v-else>
          {{ $t({ en: 'No output', zh: '无输出' }) }}
        </template>
      </UIEmpty>
      <li
        v-for="(output, i) in runtime.outputs"
        :key="i"
        :ref="(el) => handleOutput(el, i)"
        class="output"
        :class="`kind-${output.kind}`"
      >
        <span class="time">{{ humanizeTime(output.time) }}</span>
        <CodeLink v-if="getOutputSourceLocation(output) != null" class="link" v-bind="getOutputSourceLocation(output)!">
          {{ getOutputSourceLocationText(output) }}
        </CodeLink>
        <span class="message">{{ output.message }}</span>
      </li>
    </ul>
  </UICard>
</template>

<style lang="scss" scoped>
.console-panel {
  display: flex;
  flex-direction: column;
}
.output-container {
  padding: 12px;
  flex: 1 1 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.output {
  position: relative;
  font-size: 12px;
  font-family: var(--ui-font-family-code);

  --console-panel-text-color: var(--ui-color-grey-1000);
  --console-panel-tip-color: var(--ui-color-grey-700);
  &.kind-error {
    --console-panel-text-color: var(--ui-color-red-500);
    --console-panel-tip-color: var(--ui-color-red-300);
  }
}

.message {
  white-space: pre-line;
  word-break: break-all;
  color: var(--console-panel-text-color);
}

.time {
  float: left;
  margin-right: 8px;
  color: var(--console-panel-tip-color);
}

.link {
  float: right;
  margin-left: 8px;
  color: var(--console-panel-tip-color);
}
</style>
