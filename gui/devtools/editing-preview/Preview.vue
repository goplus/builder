<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { withTimeout } from '@/utils/disposable'
import { useI18n } from '@/utils/i18n'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { History } from '@/components/editor/history'
import { SpxCodeEditorProject } from '@/components/editor/spx-code-editor/spx-project'
import { SpxCompletionProvider } from '@/components/editor/spx-code-editor/completion'
import * as spxDefinitions from '@/components/editor/spx-code-editor/document-base'
import { keys as spxKeyDefinitions } from '@/components/editor/spx-code-editor/document-base/key'
import {
  CodeEditor,
  CodeEditorUI,
  DiagnosticSeverity,
  DocumentBase,
  XGoLSPClient,
  getCodeFilePath,
  getTextDocumentId,
  loadMonaco,
  useProvideCodeEditor,
  type WorkspaceDiagnostics
} from '@/components/xgo-code-editor'
import { UIButton, UIConfigProvider, UIMessageProvider, UIModalProvider } from '@/components/ui'

defineOptions({ name: 'EditingPreview' })

const fourDefinition = 'func four(a, b, c, d float64) {\n\tprintln a, b, c, d\n}\n\n'
const presets = [
  { id: 'step', label: 'step：两个参数', code: 'step 100, 1\n' },
  { id: 'glide', label: 'glide：三个参数', code: 'glide 100, 200, 1\n' },
  { id: 'four', label: '自定义：四个参数', code: fourDefinition + 'four 1, 2, 3, 4\n' },
  { id: 'five', label: '自定义：五个参数', code: 'func five(a, b, c, d, e int) {}\n\nfive 1, 2, 3, 4, 5\n' },
  { id: 'missing-four', label: '自定义：缺少 d', code: fourDefinition + 'four 1, 2, 3\n' },
  { id: 'bare-multiline', label: '裸调用：参数跨行', code: fourDefinition + 'four 1,\n\t2,\n\t3,\n\t4\n' },
  { id: 'parenthesized', label: '括号调用：参数跨行', code: fourDefinition + 'four(\n\t1,\n\t2,\n\t3,\n\t4,\n)\n' },
  { id: 'onstart', label: 'onStart：多个语句', code: 'onStart => {\n\tglide 100, 200, 1\n\tprintln "done"\n}\n' },
  {
    id: 'independent',
    label: '块外已有独立错误',
    code: 'println unknownName\n\nonStart => {\n\tglide 100, 200, 1\n\tprintln "done"\n}\n'
  },
  {
    id: 'independent-after',
    label: '后面已有独立错误',
    code: 'onStart => {\n\tstep 100, 1\n}\n\nprintln unknownName\n'
  },
  { id: 'strings-nested', label: '字符串逗号与嵌套调用', code: 'say "Hello, Lita", 2\nstep rand(10, 20), 1\n' },
  {
    id: 'callback',
    label: '回调内部的独立语句',
    code: 'onKey KeyRight, => {\n\trepeat 2, => {\n\t\tglide 100, 200, 1\n\t}\n\tprintln "done"\n}\n'
  }
]

const query = new URLSearchParams(window.location.search)
const initialPreset = presets.find((preset) => preset.id === query.get('preset')) ?? presets[0]
const selectedPreset = ref(initialPreset.id)
const simpleMode = ref(query.get('mode') !== 'normal')
const project = new SpxProject()
const sprite = new Sprite('Lita', initialPreset.code)
project.addSprite(sprite)
const history = new History(project)
const codeEditor = shallowRef<CodeEditor | null>(null)
const errorMessage = ref<string | null>(null)
const checking = ref(false)
const lastCheck = shallowRef<WorkspaceDiagnostics | null>(null)
const checkedSource = ref<string | null>(null)
const checkChanged = computed(() => checkedSource.value != null && checkedSource.value !== sprite.code)
const i18n = useI18n()
let disposed = false

useProvideCodeEditor(codeEditor)

onMounted(async () => {
  try {
    const monaco = await loadMonaco(i18n.lang.value)
    if (disposed) return
    const editorProject = new SpxCodeEditorProject(project, history)
    const lspClient = new XGoLSPClient(editorProject)
    lspClient.init()
    const documentBase = new DocumentBase([...Object.values(spxDefinitions), ...spxKeyDefinitions])
    const editor = new CodeEditor({
      project: editorProject,
      history,
      monaco,
      lspClient,
      documentBase,
      presetPackages: { spx: editorProject.classFramework.pkgPaths[0] }
    })
    editor.registerCompletionProvider(new SpxCompletionProvider(editor.completionProvider, documentBase))
    codeEditor.value = editor
    Object.assign(window, { editingPreview: { project, sprite, codeEditor: editor } })
  } catch (error) {
    errorMessage.value = String(error)
  }
})

onBeforeUnmount(() => {
  disposed = true
  codeEditor.value?.dispose()
  project.dispose()
})

async function setPreset(preset: (typeof presets)[number]) {
  const editor = codeEditor.value
  if (editor == null) return
  errorMessage.value = null
  lastCheck.value = null
  checkedSource.value = null
  await history.doAction({ name: { en: 'Load editing example', zh: '载入编辑样例' } }, () => {
    editor.getTextDocument(getTextDocumentId(sprite.codeFilePath))?.setValue(preset.code)
  })
  selectedPreset.value = preset.id
}

async function switchMode() {
  await project.mutex.runExclusive(async () => {})
  await nextTick()
  simpleMode.value = !simpleMode.value
}

async function checkCode() {
  const editor = codeEditor.value
  if (editor == null || checking.value) return
  editor.getAttachedUI()?.revealDiagnostics()
  checking.value = true
  errorMessage.value = null
  lastCheck.value = null
  try {
    await project.mutex.runExclusive(async () => {})
    await nextTick()
    checkedSource.value = sprite.code
    lastCheck.value = await withTimeout(10_000, (signal) => editor.diagnosticWorkspace(signal))
  } catch (error) {
    errorMessage.value = String(error)
  } finally {
    checking.value = false
  }
}

const diagnostics = computed(() =>
  (lastCheck.value?.items ?? []).flatMap((item) =>
    item.diagnostics.map((diagnostic) => ({ ...diagnostic, file: getCodeFilePath(item.textDocument.uri) }))
  )
)
const errorCount = computed(() => diagnostics.value.filter((item) => item.severity === DiagnosticSeverity.Error).length)
</script>

<template>
  <UIConfigProvider>
    <UIMessageProvider>
      <UIModalProvider>
        <main class="mx-auto flex min-h-screen flex-col gap-5 bg-grey-300 p-6" style="max-width: 1440px">
          <header class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex flex-col gap-2">
              <h1 class="text-title">真实语言服务 · 多参数与跨行修正版验收</h1>
              <p>本页仅用于本地开发验收，不读取或修改云端课程。</p>
              <p>“检查代码”执行静态检查并显示暂缓的诊断，不运行游戏。切换模式保留当前代码。</p>
            </div>
            <div class="flex items-center gap-3">
              <strong>{{ simpleMode ? 'Simple Mode' : 'Normal Mode' }}</strong>
              <UIButton
                v-radar="{
                  name: 'mode-toggle',
                  label: '切换编辑模式',
                  desc: '在保留代码的情况下切换 Simple Mode 和 Normal Mode'
                }"
                :disabled="codeEditor == null || checking"
                @click="switchMode"
              >
                切换到 {{ simpleMode ? 'Normal Mode' : 'Simple Mode' }}
              </UIButton>
              <UIButton
                v-radar="{
                  name: 'check-code',
                  label: '检查当前代码',
                  desc: '显示诊断并使用真实语言服务检查当前代码，不运行游戏'
                }"
                :disabled="codeEditor == null || checking"
                type="primary"
                @click="checkCode"
              >
                {{ checking ? '检查中…' : '检查代码' }}
              </UIButton>
            </div>
          </header>

          <section class="flex flex-col gap-3 rounded-xl border border-dividing-line-2 bg-grey-100 p-4">
            <p>选择样例会替换当前本地练习代码；也可以直接在编辑器中修改。</p>
            <div class="flex flex-wrap gap-2">
              <UIButton
                v-for="preset in presets"
                :key="preset.id"
                v-radar="{
                  name: 'load-preset',
                  label: preset.label,
                  desc: '用该样例替换当前本地练习代码',
                  attrs: { name: preset.id }
                }"
                :disabled="codeEditor == null || checking"
                :type="selectedPreset === preset.id ? 'primary' : 'secondary'"
                @click="setPreset(preset)"
              >
                {{ preset.label }}
              </UIButton>
            </div>
          </section>

          <div
            class="flex min-h-0 overflow-visible rounded-xl border border-dividing-line-2 bg-grey-100"
            style="height: 520px"
          >
            <CodeEditorUI
              v-if="codeEditor != null"
              :key="simpleMode ? 'simple' : 'normal'"
              :code-file-path="sprite.codeFilePath"
              :simple-mode="simpleMode"
              :api-reference-enabled="false"
            />
            <p v-else class="p-5">正在加载 Monaco 与真实 SPX 语言服务…</p>
          </div>

          <section
            class="flex flex-col gap-2 rounded-xl border border-dividing-line-2 bg-grey-100 p-4"
            aria-live="polite"
          >
            <p v-if="errorMessage != null" class="text-danger">{{ errorMessage }}</p>
            <template v-else-if="lastCheck != null">
              <p v-if="checkChanged">代码在检查期间或检查后发生了变化，请重新检查。</p>
              <p v-else>检查完成：{{ errorCount }} 个错误，{{ diagnostics.length - errorCount }} 个警告。</p>
              <ul v-if="diagnostics.length > 0" class="flex list-disc flex-col gap-2 pl-5">
                <li v-for="(diagnostic, index) in diagnostics" :key="index" class="whitespace-pre-wrap">
                  {{ diagnostic.file }}:{{ diagnostic.range.start.line }}:{{ diagnostic.range.start.column }} —
                  {{ diagnostic.message }}
                </li>
              </ul>
            </template>
            <p v-else>试着删除某个参数的值、保留逗号，然后补回内容；再比较移开光标和点击“检查代码”的反馈。</p>
          </section>
        </main>
      </UIModalProvider>
    </UIMessageProvider>
  </UIConfigProvider>
</template>
