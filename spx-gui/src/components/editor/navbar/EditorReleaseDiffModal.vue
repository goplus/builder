<!-- Diff preview modal: shows code differences between a release and the current project, per Stage/Sprite -->
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import type * as monaco from 'monaco-editor'
import { getCleanupSignal } from '@/utils/disposable'
import { untilNotNull } from '@/utils/utils'
import { UIButton, UIFormModal } from '@/components/ui'

export type DiffResource = {
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
  })
})

// Update the diff model whenever the selected resource or editor changes
watchEffect(() => {
  const editor = diffEditorRef.value
  const resource = currentResource.value
  if (editor == null || resource == null) return

  import('monaco-editor').then((monacoModule) => {
    if (diffEditorRef.value == null) return
    // Dispose old models to prevent memory leaks
    const oldModel = diffEditorRef.value.getModel()
    diffEditorRef.value.setModel({
      original: monacoModule.editor.createModel(resource.original, 'spx'),
      modified: monacoModule.editor.createModel(resource.modified, 'spx')
    })
    oldModel?.original?.dispose()
    oldModel?.modified?.dispose()
  })
})
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Release diff modal', desc: 'Modal for previewing code differences between a release and the current project' }"
    :title="title"
    :visible="visible"
    :style="{ width: '900px' }"
    :mask-closable="false"
    body-class="flex flex-col gap-0 !px-0 !pt-0 !pb-0"
    @update:visible="emit('cancelled')"
  >
    <div class="flex h-[560px]">
      <!-- Resource navigation sidebar -->
      <div class="flex w-44 shrink-0 flex-col gap-1 overflow-y-auto border-r border-grey-300 px-3 py-4">
        <button
          v-for="(resource, index) in resources"
          :key="index"
          class="rounded px-3 py-2 text-left text-sm transition-colors"
          :class="
            selectedIndex === index
              ? 'bg-primary-500 text-white'
              : 'text-grey-900 hover:bg-grey-400'
          "
          @click="selectedIndex = index"
        >
          {{ resource.label }}
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
