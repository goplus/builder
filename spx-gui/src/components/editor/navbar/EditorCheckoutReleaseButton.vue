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
import { useConfirmDialogWithResult } from '@/components/ui'
import { useMessage } from '@/components/ui'
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
      pageIndex: 0,
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

async function buildDiffResources(release: ProjectRelease): Promise<DiffResource[]> {
  const project = props.project
  const releaseFiles = getFiles(release.files)
  const resources: DiffResource[] = []

  // Stage code diff
  let releaseStageCode = ''
  const releaseStageFile = stageCodeFilePaths.map((p) => releaseFiles[p]).find((f) => f != null)
  if (releaseStageFile != null) {
    releaseStageCode = await toText(releaseStageFile)
  }
  resources.push({
    label: t({ en: 'Stage', zh: '舞台' }),
    original: project.stage.code,
    modified: releaseStageCode
  })

  // Sprites code diff — use current project's sprites as reference
  for (const sprite of project.sprites) {
    const spriteName = sprite.name
    const spriteCodePath = `${spriteName}.spx`
    let releaseCode = ''
    const releaseCodeFile = releaseFiles[spriteCodePath]
    if (releaseCodeFile != null) {
      releaseCode = await toText(releaseCodeFile)
    }
    resources.push({
      label: spriteName,
      original: sprite.code,
      modified: releaseCode
    })
  }

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
      diffResources.value = await m.withLoading(
        buildDiffResources(release),
        t({ en: 'Loading diff...', zh: '加载差异中...' })
      )
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

const selectorTitle = computed(() =>
  t({ en: 'Checkout release...', zh: '检出版本...' })
)
</script>

<template>
  <button
    v-radar="{ name: 'Checkout release button', desc: 'Click to open release selector and checkout a historical release' }"
    class="flex h-full items-center gap-1.5 border-none bg-transparent px-3 text-sm text-grey-900 outline-none hover:bg-grey-400 cursor-pointer"
    @click="handleOpen"
  >
    {{ $t({ en: 'Checkout release...', zh: '检出版本...' }) }}
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
