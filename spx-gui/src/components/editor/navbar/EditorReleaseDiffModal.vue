<!-- Diff preview modal: shows code differences between a release and the current project, per Stage/Sprite -->
<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue'
import { getCleanupSignal } from '@/utils/disposable'
import { UIButton, UIFormModal } from '@/components/ui'

export type DiffResource = {
  kind: 'stage' | 'sprite'
  label: string
  original: string // current code
  modified: string | null // release code, lazily loaded when null
  loadModified: (() => Promise<string>) | null
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

const selectedIndex = ref(-1)
const currentResource = computed(() => props.resources[selectedIndex.value] ?? null)
const modifiedCache = new Map<string, string>()
const currentOriginalText = ref('')
const currentModifiedText = ref('')
const isLoadingModified = ref(false)

function getDefaultResourceIndex(resources: DiffResource[]) {
  const stageIndex = resources.findIndex((resource) => resource.kind === 'stage')
  if (stageIndex >= 0) return stageIndex
  return resources.length > 0 ? 0 : -1
}

function handleSelectResource(index: number) {
  selectedIndex.value = index
}

type DiffRow = {
  originalNumber: string
  modifiedNumber: string
  originalText: string
  modifiedText: string
  rowClass: string
  originalClass: string
  modifiedClass: string
}

function buildDiffRows(original: string, modified: string): DiffRow[] {
  const originalLines = original.split(/\r?\n/)
  const modifiedLines = modified.split(/\r?\n/)
  const rows: DiffRow[] = []

  let i = 0
  let j = 0

  while (i < originalLines.length || j < modifiedLines.length) {
    const currentOriginal = originalLines[i]
    const currentModified = modifiedLines[j]

    if (currentOriginal != null && currentModified != null && currentOriginal === currentModified) {
      rows.push({
        originalNumber: String(i + 1),
        modifiedNumber: String(j + 1),
        originalText: currentOriginal,
        modifiedText: currentModified,
        rowClass: 'release-diff-row-equal',
        originalClass: '',
        modifiedClass: ''
      })
      i += 1
      j += 1
      continue
    }

    const nextOriginal = originalLines[i + 1]
    const nextModified = modifiedLines[j + 1]

    if (currentOriginal != null && currentModified != null && nextOriginal === currentModified) {
      rows.push({
        originalNumber: String(i + 1),
        modifiedNumber: '',
        originalText: currentOriginal,
        modifiedText: '',
        rowClass: 'release-diff-row-delete',
        originalClass: 'release-diff-line-delete',
        modifiedClass: ''
      })
      i += 1
      continue
    }

    if (currentOriginal != null && currentModified != null && currentOriginal === nextModified) {
      rows.push({
        originalNumber: '',
        modifiedNumber: String(j + 1),
        originalText: '',
        modifiedText: currentModified,
        rowClass: 'release-diff-row-add',
        originalClass: '',
        modifiedClass: 'release-diff-line-add'
      })
      j += 1
      continue
    }

    rows.push({
      originalNumber: currentOriginal == null ? '' : String(i + 1),
      modifiedNumber: currentModified == null ? '' : String(j + 1),
      originalText: currentOriginal ?? '',
      modifiedText: currentModified ?? '',
      rowClass: 'release-diff-row-change',
      originalClass: currentOriginal == null ? '' : 'release-diff-line-delete',
      modifiedClass: currentModified == null ? '' : 'release-diff-line-add'
    })

    if (currentOriginal != null) i += 1
    if (currentModified != null) j += 1
  }

  return rows
}

const diffRows = computed(() => buildDiffRows(currentOriginalText.value, currentModifiedText.value))

watch(
  currentResource,
  async (resource, _, onCleanup) => {
    if (resource == null) {
      currentOriginalText.value = ''
      currentModifiedText.value = ''
      isLoadingModified.value = false
      return
    }

    const signal = getCleanupSignal(onCleanup)
    const resourceKey = `${resource.kind}:${resource.label}`

    currentOriginalText.value = resource.original

    const cached = resource.modified ?? modifiedCache.get(resourceKey)
    if (cached != null) {
      currentModifiedText.value = cached
      isLoadingModified.value = false
      return
    }

    currentModifiedText.value = ''
    isLoadingModified.value = true

    if (resource.loadModified == null) return

    try {
      const loaded = await resource.loadModified()
      if (signal.aborted) return
      modifiedCache.set(resourceKey, loaded)
      const current = currentResource.value
      if (current == null) return
      if (`${current.kind}:${current.label}` !== resourceKey) return
      currentModifiedText.value = loaded
    } finally {
      if (!signal.aborted) isLoadingModified.value = false
    }
  },
  { immediate: true, flush: 'post' }
)

watch(
  () => props.resources,
  (resources) => {
    for (const resource of resources) {
      if (resource.modified != null) {
        modifiedCache.set(`${resource.kind}:${resource.label}`, resource.modified)
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      selectedIndex.value = getDefaultResourceIndex(props.resources)
    }
  }
)

watch(
  () => props.resources.length,
  () => {
    if (selectedIndex.value < 0 || selectedIndex.value >= props.resources.length) {
      selectedIndex.value = getDefaultResourceIndex(props.resources)
    }
  }
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      modifiedCache.clear()
      currentOriginalText.value = ''
      currentModifiedText.value = ''
      isLoadingModified.value = false
    }
  }
)

// Small component to render a single square sidebar resource tile.
const DiffResourceItem = defineComponent({
  props: {
    resource: { type: Object as () => DiffResource, required: true },
    selected: { type: Boolean, required: true }
  },
  render() {
    const { resource, selected } = this.$props
    const wrapperClass = selected
      ? 'release-diff-resource-tile release-diff-resource-tile-selected'
      : 'release-diff-resource-tile'
    if (resource.kind === 'stage') {
      return h('div', { class: wrapperClass }, [
        h('div', { class: 'release-diff-stage-preview release-diff-preview-square' }, [
          h('div', { class: 'release-diff-stage-sky' }),
          h('div', { class: 'release-diff-stage-ground' }),
          h('div', { class: 'release-diff-stage-sun' })
        ]),
        h('div', { class: 'release-diff-resource-label', title: resource.label }, resource.label)
      ])
    }
    return h('div', { class: wrapperClass }, [
      h('div', { class: 'release-diff-sprite-preview release-diff-preview-square' }, [
        h('div', { class: 'release-diff-sprite-body' }),
        h('div', { class: 'release-diff-sprite-head' }),
        h('div', { class: 'release-diff-sprite-leg release-diff-sprite-leg-left' }),
        h('div', { class: 'release-diff-sprite-leg release-diff-sprite-leg-right' })
      ]),
      h('div', { class: 'release-diff-resource-label', title: resource.label }, resource.label)
    ])
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
          v-for="(resourceItem, index) in resources"
          :key="`${resourceItem.kind}-${resourceItem.label}-${index}`"
          class="release-diff-resource-button"
          @click="handleSelectResource(index)"
        >
          <DiffResourceItem :resource="resourceItem" :selected="selectedIndex === index" />
        </button>
      </div>

      <!-- Diff viewer -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Column headers -->
        <div class="flex shrink-0 border-b border-grey-300 text-sm text-grey-700">
          <div class="flex-1 px-4 py-2">{{ $t({ en: 'Current', zh: '当前版本' }) }}</div>
          <div class="flex-1 px-4 py-2">{{ $t({ en: 'Release', zh: '发布版本' }) }}</div>
        </div>
        <div class="min-h-0 flex-1 overflow-auto">
          <div v-if="selectedIndex < 0" class="release-diff-empty-state">
            {{ $t({ en: 'Select a stage/sprite to view diff', zh: '请选择舞台或精灵查看差异' }) }}
          </div>
          <div v-else-if="isLoadingModified" class="release-diff-empty-state">
            {{ $t({ en: 'Loading release code...', zh: '正在加载发布版本代码...' }) }}
          </div>
          <div v-else>
            <div v-for="(row, index) in diffRows" :key="index" class="release-diff-row" :class="row.rowClass">
              <div class="release-diff-cell">
                <span class="release-diff-line-number">{{ row.originalNumber }}</span>
                <pre class="release-diff-line-text" :class="row.originalClass">{{ row.originalText }}</pre>
              </div>
              <div class="release-diff-cell">
                <span class="release-diff-line-number">{{ row.modifiedNumber }}</span>
                <pre class="release-diff-line-text" :class="row.modifiedClass">{{ row.modifiedText }}</pre>
              </div>
            </div>
          </div>
        </div>
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
.release-diff-stage-preview,
.release-diff-sprite-preview {
  position: relative;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(238, 244, 250, 0.96));
}

.release-diff-resource-button {
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.release-diff-resource-tile {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  padding: 6px;
}

.release-diff-resource-tile-selected {
  border-color: var(--ui-color-primary-400);
  background: rgba(23, 181, 187, 0.08);
}

.release-diff-preview-square {
  flex: 0 0 auto;
}

.release-diff-resource-label {
  min-width: 0;
  color: var(--ui-color-text-title);
  font-size: 12px;
  line-height: 1.3;
  word-break: break-all;
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
  border: 1px solid rgba(83, 110, 141, 0.18);
  background: linear-gradient(180deg, rgba(246, 248, 251, 0.98), rgba(228, 236, 246, 0.98));
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

.release-diff-empty-state {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-grey-600);
}

.release-diff-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  border-bottom: 1px solid var(--ui-color-grey-200);
}

.release-diff-cell {
  display: flex;
  min-width: 0;
  align-items: stretch;
}

.release-diff-cell + .release-diff-cell {
  border-left: 1px solid var(--ui-color-grey-200);
}

.release-diff-line-number {
  width: 44px;
  flex: 0 0 44px;
  padding: 4px 8px;
  text-align: right;
  color: var(--ui-color-grey-500);
  background: var(--ui-color-grey-100);
  border-right: 1px solid var(--ui-color-grey-200);
  font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 20px;
}

.release-diff-line-text {
  margin: 0;
  min-height: 28px;
  width: 100%;
  padding: 4px 10px;
  overflow-x: auto;
  white-space: pre;
  font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 20px;
}

.release-diff-line-delete {
  background: rgba(220, 38, 38, 0.12);
  color: #7f1d1d;
}

.release-diff-line-add {
  background: rgba(22, 163, 74, 0.12);
  color: #14532d;
}
</style>
