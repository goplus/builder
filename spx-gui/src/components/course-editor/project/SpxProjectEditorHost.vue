<script lang="ts">
import type { ILocalCache } from '@/components/editor/editing'

// The embedded learner project has no owner, so the editor runs in EffectFree mode and nothing is cached locally.
const noopLocalCache: ILocalCache = {
  async load() {
    return null
  },
  async save() {},
  async clear() {}
}

function toPathSegments(path: string) {
  return path.split('/').filter((segment) => segment !== '')
}

function paramToPathSegments(param: string | string[] | undefined) {
  if (param == null) return []
  return typeof param === 'string' ? toPathSegments(param) : param
}

function isSamePath(a: string[], b: string[]) {
  return a.length === b.length && a.every((segment, i) => segment === b[i])
}
</script>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { capture } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useQuery } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import type { SpxProject } from '@/models/spx/project'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import { EditorState } from '@/components/editor/editor-state'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { CodeEditorProvider, loadMonaco } from '@/components/editor/spx-code-editor'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  project: SpxProject
  /** In-editor path to open initially, used only when the current route does not carry one. */
  initialPath: string
}>()

const emit = defineEmits<{
  'update:editorState': [state: EditorState | null]
}>()

const i18n = useI18n()
const router = useRouter()
const { isOnline } = useNetwork()
const signedInStateQuery = useSignedInStateQuery()

const state = shallowRef<EditorState | null>(null)
const initializationError = ref<Error | null>(null)

function setState(next: EditorState | null) {
  state.value = next
  emit('update:editorState', next)
}

let disposed = false
async function initialize() {
  const previousState = state.value
  setState(null)
  initializationError.value = null
  await nextTick()
  previousState?.dispose()
  if (disposed) return

  const nextState = new EditorState(i18n, props.project, isOnline, signedInStateQuery, cloudHelpers, noopLocalCache)
  try {
    nextState.editing.startEditing()
    await openInitialPath(nextState)
    if (disposed) throw new Error('Project editor disposed during initialization')
    nextState.syncWithRouter(router)
    setState(nextState)
  } catch (error) {
    nextState.dispose()
    if (disposed) return
    initializationError.value = error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Select the initial in-editor path: the one in the current route if any, otherwise the configured one.
 * The configured path may refer to editor routes the Project Editor does not recognize yet (Simple Mode, for
 * example), so an unresolvable path falls back to the default selection instead of blocking the whole editor.
 */
async function openInitialPath(editorState: EditorState) {
  const currentRoute = router.currentRoute.value
  const routePath = paramToPathSegments(currentRoute.params.inEditorPath)
  let path = routePath.length > 0 ? routePath : toPathSegments(props.initialPath)
  try {
    editorState.selectByRoute(path)
  } catch (error) {
    capture(error, `Failed to open in-editor path /${path.join('/')}`)
    path = []
    editorState.selectByRoute(path)
  }
  if (isSamePath(path, routePath)) return
  await router.replace({
    params: { ...currentRoute.params, inEditorPath: path },
    query: currentRoute.query,
    hash: currentRoute.hash
  })
}

watch(
  () => props.project,
  () => void initialize(),
  { immediate: true }
)

const monacoQueryRet = useQuery(() => loadMonaco(i18n.lang.value), {
  en: 'Failed to load code editor',
  zh: '加载代码编辑器失败'
})

onUnmounted(() => {
  disposed = true
  const current = state.value
  setState(null)
  current?.dispose()
})
</script>

<template>
  <UIDetailedLoading v-if="state == null && initializationError == null" :percentage="0">
    <span>{{ $t({ en: 'Preparing project...', zh: '准备项目中...' }) }}</span>
  </UIDetailedLoading>
  <UIError v-else-if="initializationError != null" :retry="initialize">
    {{ initializationError.message }}
  </UIError>
  <UIDetailedLoading v-else-if="monacoQueryRet.isLoading.value" :percentage="monacoQueryRet.progress.value.percentage">
    <span>{{ $t({ en: 'Loading code editor...', zh: '加载代码编辑器中...' }) }}</span>
  </UIDetailedLoading>
  <UIError v-else-if="monacoQueryRet.error.value != null" :retry="monacoQueryRet.refetch">
    {{ $t(monacoQueryRet.error.value.userMessage) }}
  </UIError>
  <EditorContextProvider v-else-if="state != null" :project="state.project" :state="state">
    <CodeEditorProvider :monaco="monacoQueryRet.data.value!">
      <ProjectEditor />
    </CodeEditorProvider>
  </EditorContextProvider>
</template>
