<!-- Button and flow orchestrator for "Checkout release" feature in the editor navbar -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ProjectRelease } from '@/apis/project-release'
import { listProjectReleases } from '@/apis/project-release'
import { getFiles } from '@/models/common/cloud'
import { toText } from '@/models/common/file'
import { stageCodeFilePaths } from '@/models/spx/stage'
import type { SpxProject } from '@/models/spx/project'
import { useMessageHandle } from '@/utils/exception'
import { useConfirmDialogWithResult, useMessage } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import type { EditorState } from '../editor-state'
import EditorReleaseSelectorModal from './EditorReleaseSelectorModal.vue'
import EditorReleaseDiffModal from './EditorReleaseDiffModal.vue'
import type { DiffResource } from './EditorReleaseDiffModal.vue'

const props = defineProps<{
  project: SpxProject
  state: EditorState | null
}>()

const { t } = useI18n()
const m = useMessage()
const confirmWithResult = useConfirmDialogWithResult()

const selectorVisible = ref(false)
const diffVisible = ref(false)
const releases = ref<ProjectRelease[]>([])
const isLoadingReleases = ref(false)
const releasesError = ref<Error | null>(null)

const pendingRelease = ref<ProjectRelease | null>(null)
const diffResources = ref<DiffResource[]>([])

async function loadReleases() {
  const { owner, name } = props.project
  if (owner == null || name == null) return
  isLoadingReleases.value = true
  releasesError.value = null
  try {
    const result = await listProjectReleases(owner, name, {
      pageSize: 50,
      pageIndex: 1,
      orderBy: 'createdAt',
      sortOrder: 'desc'
    })
    releases.value = result.data
  } catch (e) {
    releasesError.value = e instanceof Error ? e : new Error(String(e))
  } finally {
    isLoadingReleases.value = false
  }
}

function handleOpen() {
  selectorVisible.value = true
  loadReleases()
}

function handleSelectorCancelled() {
  selectorVisible.value = false
}

function buildDiffResources(release: ProjectRelease): DiffResource[] {
  const project = props.project
  const releaseFiles = getFiles(release.files)
  const resources: DiffResource[] = []

  // Stage code diff (lazy-load release side)
  const releaseStageFile = stageCodeFilePaths.map((p) => releaseFiles[p]).find((f) => f != null)
  resources.push({
    kind: 'stage',
    label: t({ en: 'Stage', zh: '舞台' }),
    original: project.stage.code,
    modified: null,
    loadModified: async () => (releaseStageFile == null ? '' : await toText(releaseStageFile))
  })

  // Sprites in current project — diff against release side
  const currentSpriteNames = new Set(project.sprites.map((s) => s.name))
  resources.push(
    ...project.sprites.map((sprite) => {
      const spriteName = sprite.name
      const spriteCodePath = `${spriteName}.spx`
      const releaseCodeFile = releaseFiles[spriteCodePath]
      return {
        kind: 'sprite' as const,
        label: spriteName,
        original: sprite.code,
        modified: null,
        loadModified: async () => (releaseCodeFile == null ? '' : await toText(releaseCodeFile))
      }
    })
  )

  // Sprites that exist in the release but not in the current project (deleted locally)
  const releaseOnlySpriteNames = Object.keys(releaseFiles)
    .filter((path) => path.endsWith('.spx') && !stageCodeFilePaths.includes(path))
    .map((path) => path.slice(0, -4)) // strip ".spx"
    .filter((name) => !currentSpriteNames.has(name))
  resources.push(
    ...releaseOnlySpriteNames.map((spriteName) => {
      const releaseCodeFile = releaseFiles[`${spriteName}.spx`]
      return {
        kind: 'sprite' as const,
        label: spriteName,
        original: '',
        modified: null,
        loadModified: async () => (releaseCodeFile == null ? '' : await toText(releaseCodeFile))
      }
    })
  )

  return resources
}

async function performCheckout(release: ProjectRelease) {
  const { state } = props
  if (state == null) throw new Error('Editor state expected')

  const checkoutAction = { name: { en: 'Checkout release', zh: '检出版本' } }
  await m.withLoading(
    state.history.doAction(checkoutAction, async () => {
      const releaseFiles = getFiles(release.files)
      await props.project.loadFiles(releaseFiles)
    }),
    t({ en: 'Checking out release...', zh: '正在检出版本...' })
  )
  m.success(t({ en: 'Checkout successful', zh: '检出成功' }))
}

const handleSelectorAction = useMessageHandle(
  async (release: ProjectRelease, action: 'diff' | 'checkout') => {
    if (action === 'checkout') {
      // Ask for secondary confirmation if there are unsaved changes
      if (props.state?.editing?.dirty) {
        const confirmed = await confirmWithResult({
          title: t({ en: 'Unsaved changes', zh: '存在未保存的更改' }),
          content: t({
            en: 'You have unsaved changes. Checking out a release will discard them. Are you sure?',
            zh: '当前有未保存的更改，检出版本将丢弃这些更改，确定继续吗？'
          }),
          confirmText: t({ en: 'Checkout anyway', zh: '仍然检出' })
        })
        if (!confirmed) return
      }
      selectorVisible.value = false
      await performCheckout(release)
    } else {
      // Build diff resources and open diff modal
      pendingRelease.value = release
      diffResources.value = buildDiffResources(release)
      selectorVisible.value = false
      diffVisible.value = true
    }
  },
  { en: 'Failed to process release action', zh: '处理版本操作失败' }
)

function handleDiffCancelled() {
  diffVisible.value = false
  pendingRelease.value = null
  diffResources.value = []
}

const handleDiffConfirmed = useMessageHandle(
  async () => {
    const release = pendingRelease.value
    if (release == null) return

    if (props.state?.editing?.dirty) {
      const confirmed = await confirmWithResult({
        title: t({ en: 'Unsaved changes', zh: '存在未保存的更改' }),
        content: t({
          en: 'You have unsaved changes. Checking out a release will discard them. Are you sure?',
          zh: '当前有未保存的更改，检出版本将丢弃这些更改，确定继续吗？'
        }),
        confirmText: t({ en: 'Checkout anyway', zh: '仍然检出' })
      })
      if (!confirmed) return
    }

    diffVisible.value = false
    pendingRelease.value = null
    diffResources.value = []
    await performCheckout(release)
  },
  { en: 'Failed to checkout release', zh: '检出版本失败' }
)

const diffTitle = computed(() => {
  const release = pendingRelease.value
  if (release == null) return ''
  return t({ en: `Diff: ${release.name}`, zh: `差异预览：${release.name}` })
})

const selectorTitle = computed(() => t({ en: 'Checkout release...', zh: '检出版本...' }))
</script>

<template>
  <button
    v-radar="{
      name: 'Checkout release button',
      desc: 'Click to open release selector and checkout a historical release'
    }"
    :aria-label="$t({ en: 'Checkout release...', zh: '检出版本...' })"
    :title="$t({ en: 'Checkout release...', zh: '检出版本...' })"
    class="flex h-full items-center justify-center border-none bg-transparent px-3 text-grey-900 outline-none hover:bg-grey-400 cursor-pointer"
    @click="handleOpen"
  >
    <svg viewBox="0 0 16 16" aria-hidden="true" class="h-4 w-4 flex-none text-current">
      <path
        d="M5 3.5a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0zm0 9a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0zm6-6a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0z"
        fill="currentColor"
      />
      <path
        d="M7.5 5v6m0-3h4"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.2"
      />
    </svg>
  </button>

  <EditorReleaseSelectorModal
    :visible="selectorVisible"
    :releases="releases"
    :is-loading="isLoadingReleases"
    :error="releasesError"
    :title="selectorTitle"
    @cancelled="handleSelectorCancelled"
    @action="handleSelectorAction.fn"
  />

  <EditorReleaseDiffModal
    :visible="diffVisible"
    :resources="diffResources"
    :title="diffTitle"
    @cancelled="handleDiffCancelled"
    @confirmed="handleDiffConfirmed.fn"
  />
</template>
