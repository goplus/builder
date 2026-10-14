<script lang="ts">
import type { IScopedRouter, PathSegments } from '@/utils/route'
import type { ILocalCache } from '@/components/editor/editing'

// The embedded learner project has no owner, so editing runs in EffectFree mode and never uses the local cache.
const noopLocalCache: ILocalCache = {
  async load() {
    return null
  },
  async save() {},
  async clear() {}
}
</script>

<script setup lang="ts">
/**
 * Hosts the Project Editor for the learner project embedded in a course. It owns the project's `EditorState`, which
 * outlives the editor UI and retains its local path while another course view is active.
 */
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useQuery } from '@/utils/query'
import { useSignedInStateQuery } from '@/stores/user'
import { cloudHelpers } from '@/models/common/cloud'
import type { SpxProject } from '@/models/spx/project'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import { EditorState } from '@/components/editor/editor-state'
import type { History } from '@/components/editor/history'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import { CodeEditorProvider, loadMonaco } from '@/components/editor/spx-code-editor'
import { UIDetailedLoading, UIError } from '@/components/ui'

const props = defineProps<{
  /** The learner project to edit, already loaded. A new instance re-creates the editor state. */
  project: SpxProject
  /** Navigation scoped to the hosted SPX Project Editor. */
  router: IScopedRouter
  /** Where the edits of the project are recorded, together with those of the rest of the course. */
  history: History
  /**
   * Whether the project is the open document. While inactive, the editor UI is unmounted and the editor state
   * (selection, ...) is kept alive but detached from the route.
   */
  active: boolean
}>()

const emit = defineEmits<{
  /** The current editor state, or `null` while initializing, after a failure and after unmount. */
  'update:editorState': [state: EditorState | null]
}>()

const i18n = useI18n()
const { isOnline } = useNetwork()
const signedInStateQuery = useSignedInStateQuery()

// Written only through `setState`, so the parent always sees the state the editor UI renders.
const state = shallowRef<EditorState | null>(null)
const initializationError = ref<Error | null>(null)

function setState(next: EditorState | null) {
  // Store first so anything reacting to the emit already sees the new local state.
  state.value = next
  emit('update:editorState', next)
}

const retainedPath = shallowRef<PathSegments>([])
const editorRouter: IScopedRouter = {
  // While the project is not open, or sits on its transient bare root, the state keeps seeing where the project was
  // (the same array, so it does not react): shown an empty path, it would select its default and navigate there,
  // overtaking the bare-root restoration.
  currentPath: computed(() => {
    const path = props.router.currentPath.value
    return props.active && path.length > 0 ? path : retainedPath.value
  }),
  // Host navigation is dropped while the project is not open, so a selection the state makes on its own
  // (e.g. after the selected sprite was deleted) cannot take the route away from the document the author is looking at.
  push: (path, options) => {
    retainedPath.value = path
    if (!props.active) return Promise.resolve()
    return props.router.push(path, {
      replace: options?.replace || props.router.currentPath.value.length === 0
    })
  }
}

watch(
  [() => props.active, () => props.router.currentPath.value],
  ([active, path]) => {
    if (!active) return
    if (path.length > 0) retainedPath.value = path
    else if (retainedPath.value.length > 0) void props.router.push(retainedPath.value, { replace: true })
  },
  { immediate: true }
)

// Checked after each `await`, so an initialization that outlives the component neither publishes nor leaks a state.
let disposed = false

/** (Re)create the editor state for the current project. Failures go to `initializationError` instead of rejecting. */
async function initialize() {
  const previousState = state.value
  setState(null)
  initializationError.value = null
  // Let the UI unmount the components that still hold the old state before disposing it, so nothing reads a
  // disposed state during its own teardown.
  await nextTick()
  previousState?.dispose()
  if (disposed) return
  const routePath = props.router.currentPath.value
  retainedPath.value = props.active ? routePath : []

  // The project comes already loaded, so there is no `editing.loadProject` here.
  const nextState = new EditorState(
    i18n,
    props.project,
    isOnline,
    signedInStateQuery,
    cloudHelpers,
    noopLocalCache,
    props.history
  )
  try {
    nextState.editing.startEditing()
    nextState.syncWithRouter(editorRouter)
    setState(nextState)
  } catch (error) {
    nextState.dispose()
    initializationError.value = error instanceof Error ? error : new Error(String(error))
  }
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
  // Withdraw before disposing so the parent never holds a reference to a disposed state.
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
