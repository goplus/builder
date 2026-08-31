<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { UIDropdown, UIIcon, UITooltip } from '@/components/ui'
import { useCodeEditor } from '../context'
import type { TextDocumentRange } from '../common'
import type { Monaco, MonacoEditor, monaco as tmonaco } from '../monaco'
import MonacoEditorComp from './MonacoEditor.vue'
import type { DefinitionPeek } from './code-editor-ui'
import { DefinitionPeekController, type PeekReference } from './definition-peek'
import { toMonacoRange } from './common'
import { HoverController } from './hover'
import HoverUI from './hover/HoverUI.vue'

const props = defineProps<{
  monaco: Monaco
  options: tmonaco.editor.IStandaloneEditorConstructionOptions
  peek: DefinitionPeek
}>()

const emit = defineEmits<{
  close: []
  open: [TextDocumentRange, tmonaco.editor.ICodeEditorViewState | null]
}>()

const codeEditor = useCodeEditor()
const controller = shallowRef<DefinitionPeekController>()
const editorRef = shallowRef<MonacoEditor | null>(null)
const referencesVisible = ref(false)
const referencesTrigger = ref<HTMLButtonElement | null>(null)
const referencesList = ref<HTMLDivElement | null>(null)
const hoverController = shallowRef<HoverController | null>(null)

watch(
  () => props.peek,
  (peek, _, onCleanup) => {
    const next = new DefinitionPeekController(codeEditor, peek.textDocument, peek.range)
    controller.value = next
    if (peek.reference != null) next.showReference(peek.reference)
    referencesVisible.value = peek.showReferences
    void next.loadReferences().then(async () => {
      await nextTick()
      if (controller.value === next && referencesVisible.value) {
        referencesList.value?.querySelector('button')?.focus()
      }
    })
    onCleanup(() => next.dispose())
  },
  { immediate: true }
)

const current = computed(() => controller.value!.current)
const isDefinition = computed(() => current.value === controller.value!.definition)
const currentReviewCall = computed(
  () =>
    controller.value?.review?.calls.find(
      (call) =>
        call.location.textDocument === current.value.textDocument &&
        call.location.range.start.line === current.value.range.start.line &&
        call.location.range.start.column === current.value.range.start.column
    ) ?? null
)

function markCurrentCallChecked() {
  const peek = controller.value!
  const review = peek.review
  const call = currentReviewCall.value
  if (review == null || call == null) return
  review.markChecked(call)
  const next = review.remaining[0]
  if (next == null) peek.showDefinition()
  else peek.showReference({ textDocument: next.location.textDocument, range: next.location.range, code: '' })
}
const groups = computed(() => {
  const grouped = new Map<string, PeekReference[]>()
  for (const reference of controller.value?.references ?? []) {
    const uri = reference.textDocument.id.uri
    const items = grouped.get(uri) ?? []
    items.push(reference)
    grouped.set(uri, items)
  }
  return [...grouped.values()]
})

watch([controller, editorRef], ([peek, editor], _, onCleanup) => {
  if (peek == null || editor == null) return
  const hover = new HoverController({
    editor,
    monaco: props.monaco,
    codeEditor: { hoverProvider: peek },
    get activeTextDocument() {
      return peek.current.textDocument
    }
  })
  hoverController.value = hover
  hover.init()
  onCleanup(() => {
    hover.dispose()
    hoverController.value = null
  })
})

watch([current, editorRef], ([location, editor]) => {
  if (editor == null) return
  editor.setModel(location.textDocument.monacoTextModel)
  const range = toMonacoRange(location.range)
  editor.setSelection(range)
  editor.revealRangeNearTopIfOutsideViewport(range)
  if (!referencesVisible.value) editor.focus()
})

function handleEditorInit(editor: MonacoEditor) {
  editorRef.value = editor
  editor.addCommand(props.monaco.KeyCode.Escape, () => {
    if (referencesVisible.value) referencesVisible.value = false
    else emit('close')
  })
}

async function openReferences() {
  referencesVisible.value = true
  await controller.value!.loadReferences()
  await nextTick()
  if (referencesVisible.value) referencesList.value?.querySelector('button')?.focus()
}

function selectReference(reference: PeekReference) {
  controller.value!.showReference(reference)
  referencesVisible.value = false
}

function handleListKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    referencesVisible.value = false
    referencesTrigger.value?.focus()
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const buttons = [...(referencesList.value?.querySelectorAll('button:not(:disabled)') ?? [])]
  if (buttons.length === 0) return
  event.preventDefault()
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
  ;(buttons[next] as HTMLButtonElement).focus()
}

function openInEditor() {
  emit('open', current.value.target, editorRef.value?.saveViewState() ?? null)
}
</script>

<template>
  <section
    v-if="controller != null"
    v-radar="{ name: 'Definition peek', desc: 'Edit a definition or browse its references' }"
    class="min-h-0 flex flex-col overflow-hidden rounded-md border border-dividing-line-2 bg-white shadow-sm"
  >
    <header
      class="flex flex-none flex-wrap items-center justify-between gap-x-2 border-b border-dividing-line-2 px-3 py-1"
    >
      <div
        class="min-w-0 flex-[1_1_220px] truncate py-1 text-body-medium font-medium text-title"
        :title="$t(current.textDocument.displayName)"
      >
        {{ $t(isDefinition ? { en: 'Definition in', zh: '定义位于' } : { en: 'Reference in', zh: '引用位于' }) }}
        {{ $t(current.textDocument.displayName) }}
        <span class="font-normal text-grey-700"
          >· {{ $t({ en: `Line ${current.range.start.line}`, zh: `第 ${current.range.start.line} 行` }) }}</span
        >
      </div>
      <div class="ml-auto flex flex-none items-center gap-1">
        <UIDropdown
          trigger="manual"
          placement="bottom-end"
          :visible="referencesVisible"
          @update:visible="referencesVisible = $event"
        >
          <template #trigger>
            <button
              ref="referencesTrigger"
              v-radar="{ name: 'View references', desc: 'Choose from all references in this project' }"
              class="h-8 cursor-pointer rounded-sm border-0 bg-transparent px-2 text-body-medium text-primary-main hover:bg-primary-100"
              :aria-expanded="referencesVisible"
              @click="openReferences"
            >
              {{
                $t(
                  controller.review != null
                    ? {
                        en: `${controller.references?.length ?? 0} affected calls`,
                        zh: `${controller.references?.length ?? 0} 处受影响调用`
                      }
                    : controller.loading
                      ? { en: 'Loading…', zh: '加载中…' }
                      : controller.references == null
                        ? { en: 'References', zh: '查看引用' }
                        : {
                            en: `${controller.references.length} ${controller.references.length === 1 ? 'reference' : 'references'}`,
                            zh: `${controller.references.length} 处引用`
                          }
                )
              }}
            </button>
          </template>
          <div
            ref="referencesList"
            class="max-h-64 w-80 max-w-[calc(100vw-32px)] overflow-auto p-2 text-body-medium"
            @keydown="handleListKeydown"
          >
            <div v-if="controller.loading" role="status" class="px-2 py-3 text-grey-800">
              {{ $t({ en: 'Finding references…', zh: '正在查找引用…' }) }}
            </div>
            <div v-else-if="controller.failed" role="status" class="px-2 py-3 text-grey-800">
              {{ $t({ en: 'Could not load references.', zh: '未能加载引用。' }) }}
              <button
                v-radar="{ name: 'Retry references', desc: 'Retry finding references' }"
                class="cursor-pointer border-0 bg-transparent text-primary-main"
                @click="openReferences"
              >
                {{ $t({ en: 'Retry', zh: '重试' }) }}
              </button>
            </div>
            <div v-else-if="groups.length === 0" role="status" class="px-2 py-3 text-grey-800">
              {{ $t({ en: 'No references in this project', zh: '当前项目中没有引用' }) }}
            </div>
            <template v-else>
              <div v-for="group in groups" :key="group[0].textDocument.id.uri" class="mb-1 last:mb-0">
                <div class="px-2 py-1 text-caption font-medium text-grey-800">
                  {{ $t(group[0].textDocument.displayName) }}
                </div>
                <button
                  v-for="reference in group"
                  :key="`${reference.range.start.line}:${reference.range.start.column}`"
                  v-radar="{
                    name: 'Reference location',
                    desc: `Preview reference in ${reference.textDocument.id.uri}:${reference.range.start.line}`
                  }"
                  class="w-full flex cursor-pointer items-start gap-2 rounded-sm border-0 bg-transparent px-2 py-2 text-left hover:bg-primary-100 focus:bg-primary-100"
                  @click="selectReference(reference)"
                >
                  <span class="flex-none text-grey-700">{{
                    $t({ en: `Line ${reference.range.start.line}`, zh: `第 ${reference.range.start.line} 行` })
                  }}</span>
                  <code class="min-w-0 truncate text-title" :title="reference.code">{{ reference.code }}</code>
                </button>
              </div>
            </template>
          </div>
        </UIDropdown>
        <UITooltip>
          <template #trigger>
            <button
              v-radar="{
                name: 'Open peek in editor',
                desc: 'Expand the current definition or reference into the editor'
              }"
              class="h-8 w-8 flex flex-none cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent text-grey-900 hover:bg-grey-300"
              :aria-label="$t({ en: 'Open in editor', zh: '在编辑器中打开' })"
              @click="openInEditor"
            >
              <UIIcon class="h-4 w-4" type="enterFullScreen" />
            </button>
          </template>
          {{ $t({ en: 'Open in editor', zh: '在编辑器中打开' }) }}
        </UITooltip>
        <button
          v-radar="{ name: 'Close definition peek', desc: 'Close the peek without discarding edits' }"
          class="h-8 w-8 flex flex-none cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent text-grey-900 hover:bg-grey-300"
          :aria-label="$t({ en: 'Close definition peek', zh: '关闭定义面板' })"
          @click="emit('close')"
        >
          <UIIcon class="h-4 w-4" type="close" />
        </button>
      </div>
    </header>
    <div v-if="!isDefinition" class="flex-none border-b border-dividing-line-2 px-3 py-1">
      <button
        v-radar="{ name: 'Back to definition', desc: 'Return from a reference to its definition within peek' }"
        class="flex cursor-pointer items-center gap-1 border-0 bg-transparent text-body-medium text-primary-main"
        @click="controller.showDefinition()"
      >
        <UIIcon class="h-4 w-4" type="back" />{{ $t({ en: 'Back to definition', zh: '返回定义' }) }}
      </button>
      <button
        v-if="currentReviewCall != null"
        v-radar="{ name: 'Mark call checked', desc: 'Mark this call as manually reviewed and move to the next call' }"
        class="mt-1 cursor-pointer border-0 bg-transparent text-body-medium text-primary-main"
        @click="markCurrentCallChecked"
      >
        {{
          $t(
            controller.review!.remaining.length > 1
              ? { en: 'Checked · Next call', zh: '已检查，查看下一处' }
              : { en: 'Mark as checked', zh: '标记已检查' }
          )
        }}
      </button>
    </div>
    <MonacoEditorComp class="min-h-0 flex-[1_1_0]" :monaco="monaco" :options="options" @init="handleEditorInit" />
    <HoverUI v-if="hoverController != null" :controller="hoverController" />
  </section>
</template>
