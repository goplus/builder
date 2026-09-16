<script setup lang="ts">
import { UIIcon } from '@/components/ui'
import type { TextDocument } from '../text-document'
import type { Range } from '../common'
import type { Monaco, MonacoEditor, monaco as tmonaco } from '../monaco'
import MonacoEditorComp from './MonacoEditor.vue'
import { toMonacoRange } from './common'

const props = defineProps<{
  monaco: Monaco
  options: tmonaco.editor.IStandaloneEditorConstructionOptions
  textDocument: TextDocument
  range: Range
}>()

const emit = defineEmits<{
  close: []
}>()

function handleEditorInit(editor: MonacoEditor) {
  editor.setModel(props.textDocument.monacoTextModel)
  const range = toMonacoRange(props.range)
  editor.setSelection(range)
  editor.revealRangeNearTopIfOutsideViewport(range)
  editor.addCommand(props.monaco.KeyCode.Escape, () => emit('close'))
  editor.focus()
}
</script>

<template>
  <section
    v-radar="{ name: 'Definition preview', desc: `Read-only definition in ${textDocument.id.uri}` }"
    class="min-h-0 flex flex-col overflow-hidden rounded-md border border-dividing-line-2 bg-white shadow-sm"
  >
    <header class="h-10 flex items-center justify-between border-b border-dividing-line-2 px-3">
      <div class="min-w-0 flex items-center gap-2 text-body-medium">
        <span class="truncate font-medium text-title">
          {{ $t({ en: 'Definition in', zh: '定义位于' }) }} {{ $t(textDocument.displayName) }}
        </span>
        <span class="flex-none text-grey-700">
          · {{ $t({ en: `Line ${range.start.line}`, zh: `第 ${range.start.line} 行` }) }}
        </span>
      </div>
      <button
        v-radar="{ name: 'Close definition preview', desc: 'Close the definition preview' }"
        class="h-8 w-8 flex flex-none cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent hover:bg-grey-300"
        :aria-label="$t({ en: 'Close definition preview', zh: '关闭定义预览' })"
        @click="emit('close')"
      >
        <UIIcon class="h-4 w-4" type="close" />
      </button>
    </header>
    <MonacoEditorComp class="min-h-0 flex-[1_1_0]" :monaco="monaco" :options="options" @init="handleEditorInit" />
  </section>
</template>
