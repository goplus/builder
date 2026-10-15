<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { UIButton, UIModal, UIModalClose } from '@/components/ui'
import type { Monaco, MonacoEditor, monaco as tmonaco } from '../monaco'
import MonacoEditorComp from './MonacoEditor.vue'
import { toMonacoRange } from './common'
import type { ReferenceSelection } from './code-editor-ui'
import type { PeekReference } from './definition-peek'

const props = defineProps<{
  monaco: Monaco
  options: tmonaco.editor.IStandaloneEditorConstructionOptions
  selection: ReferenceSelection | null
}>()

const emit = defineEmits<{
  close: []
  open: [reference: PeekReference]
}>()

const editorRef = shallowRef<MonacoEditor | null>(null)
const selectedRef = shallowRef<PeekReference | null>(null)
const listRef = ref<HTMLDivElement | null>(null)

const groups = computed(() => {
  const grouped = new Map<string, PeekReference[]>()
  for (const reference of props.selection?.references ?? []) {
    const uri = reference.textDocument.id.uri
    const items = grouped.get(uri) ?? []
    items.push(reference)
    grouped.set(uri, items)
  }
  return [...grouped.values()]
})

watch(
  () => props.selection,
  async (selection) => {
    if (selection == null) {
      editorRef.value = null
      selectedRef.value = null
      return
    }
    selectedRef.value = selection.references[0] ?? null
    await nextTick()
    listRef.value?.querySelector<HTMLButtonElement>('button')?.focus()
  },
  { immediate: true }
)

watch([selectedRef, editorRef], ([reference, editor]) => {
  if (reference == null || editor == null) return
  editor.setModel(reference.textDocument.monacoTextModel)
  const range = toMonacoRange(reference.range)
  editor.setSelection(range)
  editor.revealRangeNearTopIfOutsideViewport(range)
})

function handleEditorInit(editor: MonacoEditor) {
  editorRef.value = editor
}

function select(reference: PeekReference) {
  selectedRef.value = reference
}

function open(reference: PeekReference) {
  emit('open', reference)
}

function openSelected() {
  if (selectedRef.value == null) return
  open(selectedRef.value)
}

function handleListKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const buttons = [...(listRef.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
  if (buttons.length === 0) return
  event.preventDefault()
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
  buttons[next].focus()
  buttons[next].click()
}
</script>

<template>
  <UIModal
    size="large"
    :visible="selection != null"
    :auto-focus="false"
    class="h-[min(640px,calc(100vh-32px))]"
    :radar="{ name: 'Reference selection', desc: 'Preview and choose a function reference' }"
    @update:visible="!$event && emit('close')"
  >
    <header class="h-14 flex flex-none items-center justify-between border-b border-grey-400 px-6">
      <div class="min-w-0">
        <h2 class="truncate text-xl text-title">
          {{ $t({ en: 'Choose a reference', zh: '选择引用位置' }) }}
        </h2>
      </div>
      <UIModalClose class="-mr-1 flex-none" @click="emit('close')" />
    </header>
    <div v-if="selection != null" class="min-h-0 flex flex-[1_1_0]">
      <section class="min-h-0 min-w-0 flex flex-[1_1_0] flex-col">
        <div
          v-if="selectedRef != null"
          class="h-11 flex flex-none items-center border-b border-dividing-line-2 px-4 text-body-medium text-grey-800"
        >
          <span class="truncate">{{ $t(selectedRef.textDocument.displayName) }}</span>
          <span class="ml-1 flex-none">
            ·
            {{
              $t({
                en: `Line ${selectedRef.range.start.line}`,
                zh: `第 ${selectedRef.range.start.line} 行`
              })
            }}
          </span>
        </div>
        <MonacoEditorComp class="min-h-0 flex-[1_1_0]" :monaco="monaco" :options="options" @init="handleEditorInit" />
      </section>
      <aside class="w-80 min-h-0 flex flex-none flex-col border-l border-dividing-line-2">
        <div
          class="h-11 flex flex-none items-center border-b border-dividing-line-2 px-4 text-body-medium text-grey-800"
        >
          {{
            $t({
              en: `${selection.references.length} references`,
              zh: `${selection.references.length} 处引用`
            })
          }}
        </div>
        <div
          ref="listRef"
          class="min-h-0 flex-[1_1_0] overflow-y-auto p-2 [scrollbar-width:thin]"
          @keydown="handleListKeydown"
        >
          <div v-for="group in groups" :key="group[0].textDocument.id.uri" class="mb-2 last:mb-0">
            <div class="px-2 py-1 text-caption font-medium text-grey-800">
              {{ $t(group[0].textDocument.displayName) }}
            </div>
            <button
              v-for="reference in group"
              :key="`${reference.textDocument.id.uri}:${reference.range.start.line}:${reference.range.start.column}`"
              v-radar="{
                name: 'Reference location',
                desc: `Preview reference in ${reference.textDocument.id.uri}:${reference.range.start.line}`
              }"
              class="w-full flex cursor-pointer items-start gap-2 rounded-sm border-0 px-2 py-2 text-left text-body-medium"
              :class="
                selectedRef === reference
                  ? 'bg-primary-100 text-title'
                  : 'bg-transparent text-title hover:bg-grey-300 focus:bg-grey-300'
              "
              :aria-pressed="selectedRef === reference"
              @click="select(reference)"
              @dblclick="open(reference)"
              @keydown.enter.prevent="open(reference)"
            >
              <span class="flex-none text-grey-700">
                {{ $t({ en: `Line ${reference.range.start.line}`, zh: `第 ${reference.range.start.line} 行` }) }}
              </span>
              <code class="min-w-0 truncate" :title="reference.code">{{ reference.code }}</code>
            </button>
          </div>
        </div>
      </aside>
    </div>
    <footer
      v-if="selection != null"
      class="flex flex-none items-center justify-end gap-3 border-t border-grey-400 px-6 py-4"
    >
      <UIButton
        v-radar="{ name: 'Cancel reference selection', desc: 'Close without opening a reference' }"
        type="neutral"
        @click="emit('close')"
      >
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Open selected reference', desc: 'Open the selected reference in the editor' }"
        type="primary"
        :disabled="selectedRef == null"
        @click="openSelected"
      >
        {{ $t({ en: 'Open', zh: '打开' }) }}
      </UIButton>
    </footer>
  </UIModal>
</template>
