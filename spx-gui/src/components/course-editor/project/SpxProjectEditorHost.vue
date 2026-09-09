<script lang="ts">
import type { RouteLocationNormalizedGeneric } from 'vue-router'
import type { ILocalCache } from '@/components/editor/editing'
import { inCourseEditorPathParam, paramToSegments, projectDocSegment } from '../route'

// The embedded learner project has no owner, so the editor runs in EffectFree mode and nothing is cached locally.
const noopLocalCache: ILocalCache = {
  async load() {
    return null
  },
  async save() {},
  async clear() {}
}

type RouteSnapshot = Pick<RouteLocationNormalizedGeneric, 'fullPath' | 'params' | 'query' | 'hash'>

function isProjectDocRoute(route: RouteSnapshot) {
  return paramToSegments(route.params[inCourseEditorPathParam])[0] === projectDocSegment
}

/** The Project Editor's in-editor path carried by the Course Editor route (empty unless the project document is open). */
function projectInEditorPath(route: RouteSnapshot) {
  const [doc, ...rest] = paramToSegments(route.params[inCourseEditorPathParam])
  return doc === projectDocSegment ? rest : []
}

/**
 * What the Project Editor's state sees as its route: the Course Editor route with the `project/…` tail presented
 * under the `inEditorPath` param the state expects.
 */
function translateRoute(route: RouteSnapshot): RouteSnapshot {
  const params = { ...route.params }
  delete params[inCourseEditorPathParam]
  return {
    fullPath: route.fullPath,
    params: { ...params, inEditorPath: projectInEditorPath(route) },
    query: { ...route.query },
    hash: route.hash
  }
}

function toPathSegments(path: string) {
  return path.split('/').filter((segment) => segment !== '')
}

function isSamePath(a: string[], b: string[]) {
  return a.length === b.length && a.every((segment, i) => segment === b[i])
}
</script>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { capture } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useQuery } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import type { SpxProject } from '@/models/spx/project'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import { EditorState, type IRouter } from '@/components/editor/editor-state'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { CodeEditorProvider, loadMonaco } from '@/components/editor/spx-code-editor'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  project: SpxProject
  /** In-editor path to open the first time the project document is shown, unless the route already carries one. */
  initialPath: string
  /**
   * Whether the project document is open: the editor UI is shown and follows the route. While inactive, the
   * editor state (selection, undo history, ...) is kept alive but detached from the route, so other documents
   * and the course preview can drive the route freely.
   */
  active: boolean
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

// The editor state follows the route only while the project document is open. Otherwise it keeps seeing the
// last project route (so nothing gets deselected while another document or the preview drives the route) and
// its own navigations are dropped; the Project Editor's in-editor path is mapped to and from the `project/…` tail.
const lastProjectRoute = shallowRef<RouteSnapshot | null>(null)
watch(
  () => router.currentRoute.value,
  (current) => {
    // A bare `project` (no tail) is transient: it gets replaced with the last or initial path right away.
    if (props.active && projectInEditorPath(current).length > 0) lastProjectRoute.value = translateRoute(current)
  },
  { immediate: true }
)
const editorRouter: IRouter = {
  currentRoute: computed(() => {
    const current = router.currentRoute.value
    if (props.active && isProjectDocRoute(current)) return translateRoute(current)
    return lastProjectRoute.value ?? translateRoute(current)
  }),
  push: (to) => {
    if (!props.active) return Promise.resolve()
    const current = router.currentRoute.value
    return router.push({
      query: current.query,
      hash: current.hash,
      ...to,
      params: {
        ...current.params,
        [inCourseEditorPathParam]: [projectDocSegment, ...paramToSegments(to.params?.inEditorPath)]
      }
    })
  }
}

let disposed = false
// Route sync starts the first time the project document is opened, so that opening the course on another
// document does not write the project's route.
let routeSynced = false

async function initialize() {
  const previousState = state.value
  setState(null)
  initializationError.value = null
  lastProjectRoute.value = null
  routeSynced = false
  await nextTick()
  previousState?.dispose()
  if (disposed) return

  const nextState = new EditorState(i18n, props.project, isOnline, signedInStateQuery, cloudHelpers, noopLocalCache)
  try {
    nextState.editing.startEditing()
    if (props.active) await startRouteSync(nextState)
    if (disposed) throw new Error('Project editor disposed during initialization')
    setState(nextState)
  } catch (error) {
    nextState.dispose()
    if (disposed) return
    initializationError.value = error instanceof Error ? error : new Error(String(error))
  }
}

async function startRouteSync(editorState: EditorState) {
  await openInitialPath(editorState)
  if (disposed) return
  editorState.syncWithRouter(editorRouter)
  routeSynced = true
}

/**
 * Select the initial in-editor path: the one in the route if any, otherwise the configured one.
 * The configured path may refer to editor routes the Project Editor does not recognize yet (Simple Mode, for
 * example), so an unresolvable path falls back to the default selection instead of blocking the whole editor.
 */
async function openInitialPath(editorState: EditorState) {
  const routePath = projectInEditorPath(router.currentRoute.value)
  let path = routePath.length > 0 ? routePath : toPathSegments(props.initialPath)
  try {
    editorState.selectByRoute(path)
  } catch (error) {
    capture(error, `Failed to open in-editor path /${path.join('/')}`)
    path = []
    editorState.selectByRoute(path)
  }
  if (isSamePath(path, routePath)) return
  await editorRouter.push({ params: { inEditorPath: path }, replace: true })
}

watch(
  () => props.project,
  () => void initialize(),
  { immediate: true }
)

watch(
  () => props.active,
  async (active) => {
    const editorState = state.value
    if (editorState == null) return
    if (!active) {
      // Known gap (owner: #3416): unmounting the editor UI tears down the project runner, but
      // `EditorPreview` does not reset `EditorState.runtime` on unmount, so a project that was running
      // comes back with `runtime.running` still in debug mode. To be fixed in `EditorPreview` itself.
      return
    }
    if (!routeSynced) {
      await startRouteSync(editorState)
      return
    }
    // Reopened without a path (e.g. from the explorer): return to where the editor was.
    const last = lastProjectRoute.value
    if (last == null) return
    const lastPath = paramToSegments(last.params.inEditorPath)
    if (projectInEditorPath(router.currentRoute.value).length === 0 && lastPath.length > 0) {
      const current = router.currentRoute.value
      await router.replace({
        params: { ...current.params, [inCourseEditorPathParam]: [projectDocSegment, ...lastPath] },
        query: last.query,
        hash: last.hash
      })
    }
  }
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
  <template v-if="active">
    <UIDetailedLoading v-if="state == null && initializationError == null" :percentage="0">
      <span>{{ $t({ en: 'Preparing project...', zh: '准备项目中...' }) }}</span>
    </UIDetailedLoading>
    <UIError v-else-if="initializationError != null" :retry="initialize">
      {{ initializationError.message }}
    </UIError>
    <UIDetailedLoading
      v-else-if="monacoQueryRet.isLoading.value"
      :percentage="monacoQueryRet.progress.value.percentage"
    >
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
</template>
