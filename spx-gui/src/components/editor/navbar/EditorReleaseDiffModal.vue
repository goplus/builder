<!-- Diff preview modal: shows code differences between a release and the current project, per Stage/Sprite -->
<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, watchEffect } from 'vue'
import type * as monaco from 'monaco-editor'
import type { File } from '@/models/common/file'
import { getCleanupSignal } from '@/utils/disposable'
import { untilNotNull } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'
import { UIButton, UIBlockItem, UIBlockItemTitle, UIEditorSpriteItem, UIImg, UIFormModal } from '@/components/ui'

export type DiffResource = {
  kind: 'stage' | 'sprite'
  label: string
  original: string // current code
  modified: string // release code
  thumbnailFile?: File | null
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
    maxComputationTime: 5000,
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
  })
})

// Update the diff model whenever the selected resource or editor changes.
// Uses a version counter to discard stale async results when the user switches
// resources quickly, preventing model leaks and the resulting editor freeze.
let modelVersion = 0

watch(
  [() => diffEditorRef.value, currentResource],
  async ([editor, resource]) => {
    if (editor == null || resource == null) return

    const version = ++modelVersion
    const monacoModule = await import('monaco-editor')
    if (version !== modelVersion) return
    if (diffEditorRef.value == null) return

    const originalModel = monacoModule.editor.createModel(resource.original, 'xgo')
    const modifiedModel = monacoModule.editor.createModel(resource.modified, 'xgo')

    if (version !== modelVersion) {
      originalModel.dispose()
      modifiedModel.dispose()
      return
    }

    // Capture old models before replacing so we can dispose them after the swap
    const oldModel = diffEditorRef.value.getModel()
    diffEditorRef.value.setModel({ original: originalModel, modified: modifiedModel })
    oldModel?.original?.dispose()
    oldModel?.modified?.dispose()
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

// Small component to render a single sidebar resource item with its own reactive thumbnail URL
const DiffResourceItem = defineComponent({
  props: {
    resource: { type: Object as () => DiffResource, required: true },
    selected: { type: Boolean, required: true }
  },
  setup(p) {
    const [imgSrc, imgLoading] = useFileUrl(() => p.resource.thumbnailFile ?? null)
    return { imgSrc, imgLoading }
  },
  render() {
    const { resource, selected } = this.$props
    if (resource.kind === 'stage') {
      return h(
        UIBlockItem,
        { class: 'release-diff-resource-item w-full', size: 'large', active: selected, interactive: true },
        {
          default: () => [
            h(UIImg, {
              src: this.imgSrc,
              loading: this.imgLoading,
              class: 'release-diff-stage-thumbnail',
              size: 'cover'
            }),
            h(UIBlockItemTitle, { class: 'mt-2', size: 'large', title: resource.label }, () => resource.label)
          ]
        }
      )
    }
    return h(
      UIEditorSpriteItem,
      { class: 'release-diff-resource-item w-full', name: resource.label, selectable: { selected } },
      {
        img: ({ style }: { style: object }) => h(UIImg, { style, src: this.imgSrc, loading: this.imgLoading })
      }
    )
  }
})
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
          <DiffResourceItem :resource="resource" :selected="selectedIndex === index" />
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
.release-diff-stage-thumbnail {
  width: 100%;
  height: 60px;
  border-radius: 8px;
  border: 1px solid var(--ui-color-grey-400);
}
</style>
