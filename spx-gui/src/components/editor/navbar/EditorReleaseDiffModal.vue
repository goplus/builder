<!-- Diff preview modal: shows code differences between a release and the current project, per Stage/Sprite -->
<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import type * as monaco from 'monaco-editor'
import { getCleanupSignal } from '@/utils/disposable'
import { untilNotNull, untilTaskScheduled } from '@/utils/utils'
import { UIButton, UIBlockItem, UIBlockItemTitle, UIEditorSpriteItem, UIFormModal } from '@/components/ui'

export type DiffResource = {
  kind: 'stage' | 'sprite'
  label: string
  original: string // current code
  modified: string // release code
}

const props = defineProps<{
  visible: boolean
  resources: DiffResource[]
  title: string
}>()

const emit = defineEmits<{
  cancelled: []
  confirmed: []
}>()

const selectedIndex = ref(0)
const currentResource = computed(() => props.resources[selectedIndex.value] ?? null)

// Monaco diff editor
const diffContainerRef = ref<HTMLDivElement>()
const diffEditorRef = ref<monaco.editor.IStandaloneDiffEditor | null>(null)
const originalDecorationIds = ref<string[]>([])
const modifiedDecorationIds = ref<string[]>([])

function clearDiffDecorations() {
  const editor = diffEditorRef.value
  if (editor == null) {
    originalDecorationIds.value = []
    modifiedDecorationIds.value = []
    return
  }
  originalDecorationIds.value = editor.getOriginalEditor().deltaDecorations(originalDecorationIds.value, [])
  modifiedDecorationIds.value = editor.getModifiedEditor().deltaDecorations(modifiedDecorationIds.value, [])
}

function applyLineDiffDecorations(lineChanges: monaco.editor.ILineChange[]) {
  const editor = diffEditorRef.value
  if (editor == null) return

  const originalDecorations: monaco.editor.IModelDeltaDecoration[] = []
  const modifiedDecorations: monaco.editor.IModelDeltaDecoration[] = []

  for (const change of lineChanges) {
    if (change.originalStartLineNumber <= change.originalEndLineNumber) {
      originalDecorations.push({
        range: {
          startLineNumber: change.originalStartLineNumber,
          startColumn: 0,
          endLineNumber: change.originalEndLineNumber,
          endColumn: 0
        },
        options: {
          isWholeLine: true,
          className: 'release-diff-line-removed-body',
          linesDecorationsClassName: 'release-diff-line-removed-header'
        }
      })
    }

    if (change.modifiedStartLineNumber <= change.modifiedEndLineNumber) {
      modifiedDecorations.push({
        range: {
          startLineNumber: change.modifiedStartLineNumber,
          startColumn: 0,
          endLineNumber: change.modifiedEndLineNumber,
          endColumn: 0
        },
        options: {
          isWholeLine: true,
          className: 'release-diff-line-added-body',
          linesDecorationsClassName: 'release-diff-line-added-header'
        }
      })
    }
  }

  originalDecorationIds.value = editor.getOriginalEditor().deltaDecorations(originalDecorationIds.value, originalDecorations)
  modifiedDecorationIds.value = editor.getModifiedEditor().deltaDecorations(modifiedDecorationIds.value, modifiedDecorations)
}

async function refreshDiffDecorations(signal: AbortSignal) {
  for (let attempt = 0; attempt < 30; attempt++) {
    signal.throwIfAborted()
    const editor = diffEditorRef.value
    if (editor == null) return

    const lineChanges = editor.getLineChanges()
    if (lineChanges != null) {
      applyLineDiffDecorations(lineChanges)
      return
    }

    await untilTaskScheduled('background', signal)
  }

  clearDiffDecorations()
}

// Create the diff editor when the modal becomes visible
watchEffect(async (onCleanup) => {
  if (!props.visible) return
  const signal = getCleanupSignal(onCleanup)
  const container = await untilNotNull(diffContainerRef)
  if (signal.aborted) return

  const monacoModule = await import('monaco-editor')
  if (signal.aborted) return

  const editor = monacoModule.editor.createDiffEditor(container, {
    readOnly: true,
    renderSideBySide: true,
    automaticLayout: true,
    maxComputationTime: 1000,
    hideUnchangedRegions: {
      enabled: true,
      contextLineCount: 3,
      minimumLineCount: 3,
      revealLineCount: 20
    },
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    scrollbar: { useShadows: false, verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
    originalEditable: false,
    enableSplitViewResizing: true,
    ignoreTrimWhitespace: false
  })
  diffEditorRef.value = editor

  signal.addEventListener('abort', () => {
    editor.dispose()
    diffEditorRef.value = null
    clearDiffDecorations()
  })
})

// Update the diff model whenever the selected resource or editor changes
watch(
  [() => diffEditorRef.value, currentResource],
  async ([editor, resource], _, onCleanup) => {
    if (editor == null || resource == null) return

    const signal = getCleanupSignal(onCleanup)
    await untilTaskScheduled('user-visible', signal)

    const monacoModule = await import('monaco-editor')
    signal.throwIfAborted()
    if (diffEditorRef.value == null) return

    // Dispose old models to prevent memory leaks
    const oldModel = diffEditorRef.value.getModel()
    diffEditorRef.value.setModel({
      original: monacoModule.editor.createModel(resource.original, 'spx'),
      modified: monacoModule.editor.createModel(resource.modified, 'spx')
    })
    oldModel?.original?.dispose()
    oldModel?.modified?.dispose()
    await refreshDiffDecorations(signal)
  },
  { immediate: true, flush: 'post' }
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) selectedIndex.value = 0
  }
)

watch(
  () => props.resources.length,
  (length) => {
    if (selectedIndex.value >= length) selectedIndex.value = 0
  }
)
</script>

<template>
  <UIFormModal
    :radar="{
      name: 'Release diff modal',
      desc: 'Modal for previewing code differences between a release and the current project'
    }"
    :title="title"
    :visible="visible"
    :style="{ width: '900px' }"
    :mask-closable="false"
    body-class="flex flex-col gap-0 !px-0 !pt-0 !pb-0"
    @update:visible="emit('cancelled')"
  >
    <div class="flex h-140">
      <!-- Resource navigation sidebar -->
      <div class="flex w-44 shrink-0 flex-col gap-2 overflow-y-auto border-r border-grey-300 px-3 py-4">
        <button
          v-for="(resource, index) in resources"
          :key="`${resource.kind}-${resource.label}-${index}`"
          class="text-left outline-none"
          @click="selectedIndex = index"
        >
          <UIBlockItem
            v-if="resource.kind === 'stage'"
            class="release-diff-resource-item"
            size="large"
            :active="selectedIndex === index"
            :interactive="true"
          >
            <div class="release-diff-stage-preview">
              <div class="release-diff-stage-sky"></div>
              <div class="release-diff-stage-ground"></div>
              <div class="release-diff-stage-sun"></div>
            </div>
            <UIBlockItemTitle class="mt-2" size="large" :title="resource.label">
              {{ resource.label }}
            </UIBlockItemTitle>
          </UIBlockItem>
          <UIEditorSpriteItem
            v-else
            class="release-diff-resource-item"
            :name="resource.label"
            :selectable="{ selected: selectedIndex === index }"
          >
            <template #img="{ style }">
              <div :style="style" class="release-diff-sprite-preview">
                <div class="release-diff-sprite-body"></div>
                <div class="release-diff-sprite-head"></div>
                <div class="release-diff-sprite-leg release-diff-sprite-leg-left"></div>
                <div class="release-diff-sprite-leg release-diff-sprite-leg-right"></div>
              </div>
            </template>
          </UIEditorSpriteItem>
        </button>
      </div>

      <!-- Diff viewer -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Column headers -->
        <div class="flex shrink-0 border-b border-grey-300 text-sm text-grey-700">
          <div class="flex-1 px-4 py-2">{{ $t({ en: 'Current', zh: '当前版本' }) }}</div>
          <div class="flex-1 px-4 py-2">{{ $t({ en: 'Release', zh: '发布版本' }) }}</div>
        </div>
        <div ref="diffContainerRef" class="min-h-0 flex-1"></div>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="flex justify-end gap-3 border-t border-grey-300 px-6 py-4">
      <UIButton type="neutral" @click="emit('cancelled')">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton type="primary" @click="emit('confirmed')">
        {{ $t({ en: 'Confirm checkout', zh: '确认检出' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>

<style scoped>
.release-diff-resource-item {
  width: 100%;
}

.release-diff-stage-preview,
.release-diff-sprite-preview {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(238, 244, 250, 0.96));
}

.release-diff-stage-preview {
  border: 1px solid rgba(83, 110, 141, 0.2);
}

.release-diff-stage-sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #bfe9ff 0%, #f4fbff 62%);
}

.release-diff-stage-ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 22%;
  background: linear-gradient(180deg, #94d37d 0%, #5ea94f 100%);
}

.release-diff-stage-sun {
  position: absolute;
  top: 12%;
  right: 12%;
  width: 18%;
  aspect-ratio: 1;
  border-radius: 999px;
  background: radial-gradient(circle at 35% 35%, #fff2a8 0%, #ffd24d 58%, #ffae00 100%);
  box-shadow: 0 0 0 8px rgba(255, 213, 77, 0.16);
}

.release-diff-sprite-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(246, 248, 251, 0.98), rgba(228, 236, 246, 0.98));
  border: 1px solid rgba(83, 110, 141, 0.18);
}

.release-diff-sprite-body {
  position: absolute;
  width: 42%;
  height: 44%;
  border-radius: 28% 28% 22% 22%;
  background: linear-gradient(180deg, #5fc4ff 0%, #2d84f5 100%);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.08);
}

.release-diff-sprite-head {
  position: absolute;
  top: 26%;
  width: 26%;
  height: 18%;
  border-radius: 999px;
  background: #ffd3a1;
  box-shadow: 0 -10px 0 0 #ffd3a1;
}

.release-diff-sprite-leg {
  position: absolute;
  bottom: 16%;
  width: 9%;
  height: 18%;
  border-radius: 999px;
  background: #2d84f5;
}

.release-diff-sprite-leg-left {
  margin-right: 10%;
}

.release-diff-sprite-leg-right {
  margin-left: 10%;
}

:deep(.release-diff-line-removed-body),
:deep(.release-diff-line-added-body) {
  z-index: 0;
}

:deep(.release-diff-line-removed-body) {
  background-color: rgba(255, 70, 70, 0.12);
}

:deep(.release-diff-line-removed-header) {
  background-color: rgba(255, 70, 70, 0.3);
  width: 100% !important;
  left: 0 !important;
}

:deep(.release-diff-line-added-body) {
  background-color: rgba(43, 179, 96, 0.12);
}

:deep(.release-diff-line-added-header) {
  background-color: rgba(43, 179, 96, 0.3);
  width: 100% !important;
  left: 0 !important;
}
</style>
