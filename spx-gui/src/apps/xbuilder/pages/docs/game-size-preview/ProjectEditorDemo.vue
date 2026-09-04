<template>
  <section class="h-screen min-h-0 w-full flex flex-col bg-grey-300" data-testid="real-editor-shell">
    <header class="flex-none">
      <EditorNavbar :project="project" :state="editorState" :new-project-handler="newProjectHandler">
        <template #profile-menu>
          <div
            v-radar="{ name: 'Preview focus mode switch', desc: 'Hide Sprites and Stage panels in the demo' }"
            class="min-w-52 flex items-center justify-between gap-4 px-2 py-2 text-sm text-grey-1000"
            @click.stop
          >
            <span>{{ $t({ en: 'Hide Sprites and Stage panels', zh: '隐藏精灵/舞台面板' }) }}</span>
            <UISwitch v-model:value="previewFocused" />
          </div>
        </template>
      </EditorNavbar>
    </header>

    <main class="relative min-h-0 flex-[1_1_0] flex gap-xl p-4 pt-2">
      <div v-if="loadError != null" class="h-full w-full flex items-center justify-center p-8 text-red-700">
        {{ $t({ en: 'Failed to initialize the real editor preview.', zh: '真实编辑器预览初始化失败。' }) }}
      </div>
      <div v-else-if="editorState == null || monaco == null" class="relative min-h-0 flex-1">
        <UILoading cover />
      </div>
      <EditorContextProvider v-else :project="project" :state="editorState">
        <CodeEditorProvider :monaco="monaco">
          <ProjectEditor :layout="editorLayout" />
        </CodeEditorProvider>
      </EditorContextProvider>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { UILoading, UISwitch } from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { useSignedInStateQuery } from '@/stores/user'
import type { ProjectSerialized } from '@/models/project'
import type { SpxProject } from '@/models/spx/project'
import { cloudHelpers } from '@/models/common/cloud'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'
import ProjectEditor from '@/components/editor/ProjectEditor.vue'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'
import { EditorState } from '@/components/editor/editor-state'
import type { ILocalCache } from '@/components/editor/editing'
import { CodeEditorProvider, loadMonaco, type Monaco } from '@/components/editor/spx-code-editor'
import type { DemoProjectTemplate } from './templates'

const props = defineProps<{
  project: SpxProject
  template: DemoProjectTemplate
  newProjectHandler: () => void | Promise<void>
}>()

const localCache: ILocalCache = {
  async load() {
    return null
  },
  async save(_serialized: ProjectSerialized) {},
  async clear() {}
}

const i18n = useI18n()
const { isOnline } = useNetwork()
const signedInStateQuery = useSignedInStateQuery()
const previewFocused = ref(false)
const editorLayout = computed(() => {
  if (previewFocused.value) return 'focused'
  return props.template.orientation === 'portrait' ? 'portrait' : 'landscape'
})
const editorState = shallowRef<EditorState | null>(null)
const monaco = shallowRef<Monaco | null>(null)
const loadError = shallowRef<unknown>(null)
let disposed = false

watch(
  () => props.project,
  (project) => {
    editorState.value?.dispose()
    editorState.value = new EditorState(i18n, project, isOnline, signedInStateQuery, cloudHelpers, localCache)
  },
  { immediate: true }
)

onMounted(async () => {
  try {
    const loadedMonaco = await loadMonaco(i18n.lang.value)
    if (!disposed) monaco.value = loadedMonaco
  } catch (error) {
    loadError.value = error
  }
})

onBeforeUnmount(() => {
  disposed = true
  editorState.value?.dispose()
  editorState.value = null
})
</script>
