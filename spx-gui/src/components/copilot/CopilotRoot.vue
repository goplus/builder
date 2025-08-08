<script lang="ts">
import { z } from 'zod'
import { debounce } from 'lodash'
import { inject, onBeforeUnmount, onMounted, provide, watch, type ComputedRef, type InjectionKey } from 'vue'
import { useRouter, type Router } from 'vue-router'
import { useRadar, type Radar, type RadarNodeInfo } from '@/utils/radar'
import { useI18n, type I18n } from '@/utils/i18n'
import { escapeHTML } from '@/utils/utils'
import * as projectApis from '@/apis/project'
import { Project } from '@/models/project'
import { getSignedInUsername } from '@/stores/user'
import { useModalEvents } from '@/components/ui/modal/UIModalProvider.vue'
import { useEditorCtxRef, type EditorCtx } from '../editor/EditorContextProvider.vue'
import { useCodeEditorCtxRef, type CodeEditorCtx } from '../editor/code-editor/context'
import { useMessageEvents } from '../ui/message/UIMessageProvider.vue'
import { Copilot, type ICopilotContextProvider, type ToolDefinition } from './copilot'
import * as toolUse from './custom-elements/ToolUse'
import * as pageLink from './custom-elements/PageLink'
import * as highlightLink from './custom-elements/HighlightLink.vue'
import * as codeLink from './custom-elements/CodeLink'
import * as codeChange from './custom-elements/CodeChange.vue'
import { codeFilePathSchema, parseProjectIdentifier, projectIdentifierSchema } from './common'
import { LocalStorageSessionStorage } from './copilot-storage'

const copilotInjectionKey: InjectionKey<Copilot> = Symbol('copilot')

export function useCopilot(): Copilot {
  const copilot = inject(copilotInjectionKey)
  if (!copilot) throw new Error('Copilot not provided')
  return copilot
}

const listProjectsParamsSchema = z.object({
  owner: z
    .string()
    .describe("The owner's username. Defaults to the current-signed-in user. Use * to include projects from all users"),
  keyword: z.string().optional().describe('Keyword in the project name'),
  pageSize: z.number().describe('Number of projects to return per page'),
  pageIndex: z.number().describe('Page index, starting from 1')
})

const listProjectsTool: ToolDefinition = {
  name: 'list_projects',
  description: 'List all projects for a user.',
  parameters: listProjectsParamsSchema,
  async implementation(params: z.infer<typeof listProjectsParamsSchema>) {
    const { total, data } = await projectApis.listProject(params)
    return { total, data: data.map((p) => [p.owner, p.name].map(encodeURIComponent).join('/')) }
  }
}

class Retriever {
  constructor(private editorCtxRef: ComputedRef<EditorCtx | undefined>) {}

  async getProject(project: string | undefined, signal?: AbortSignal): Promise<Project> {
    const currentProject = this.editorCtxRef.value?.project
    if (project == null) {
      if (currentProject == null) throw new Error('No project specified and no current editing project available')
      return currentProject
    }
    const { owner, name } = parseProjectIdentifier(project)
    if (currentProject != null && currentProject.owner === owner && currentProject.name === name) {
      return currentProject
    }
    const p = new Project()
    await p.loadFromCloud(owner, name, true, signal)
    return p
  }
}

const getProjectMetadataParamsSchema = z.object({
  project: projectIdentifierSchema
})

class GetProjectMetadataTool implements ToolDefinition {
  name = 'get_project_metadata'
  description = 'Get metadata of a project.'
  parameters = getProjectMetadataParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation({ project }: z.infer<typeof getProjectMetadataParamsSchema>, signal?: AbortSignal) {
    const p = await this.retriever.getProject(project, signal)
    const { owner: pOwner, remixedFrom, visibility, description, instructions } = p
    return { owner: pOwner, remixedFrom, visibility, description, instructions }
  }
}

const getProjectSpritesParamsSchema = z.object({
  project: projectIdentifierSchema
})

class GetProjectSpritesTool implements ToolDefinition {
  name = 'get_project_sprites'
  description = 'Get sprites of a project.'
  parameters = getProjectSpritesParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation({ project }: z.infer<typeof getProjectSpritesParamsSchema>, signal?: AbortSignal) {
    const p = await this.retriever.getProject(project, signal)
    return p.sprites.map((s) => s.name)
  }
}

type LineRangeParams = {
  /** 1-based */
  lineStart?: number
  /** 1-based */
  lineEnd?: number
}

const lineStartSchema = z.number().default(1).describe('Line number to start from, 1-based')
const lineEndSchema = z.number().optional().describe('Line number to end at, 1-based')

/** Process code content and return in LLM-friendly format. */
function processCode(code: string, { lineStart = 1, lineEnd }: LineRangeParams) {
  const lines = code
    .split(/\r?\n/)
    .slice(lineStart - 1, lineEnd)
    .reduce<Record<string, string>>((o, line, i) => {
      o[i + lineStart] = line
      return o
    }, {})
  return { lines }
}

const getProjectCodeParamsSchema = z.object({
  project: projectIdentifierSchema,
  file: codeFilePathSchema,
  lineStart: lineStartSchema,
  lineEnd: lineEndSchema
})

class GetProjectCodeTool implements ToolDefinition {
  name = 'get_project_code'
  description = 'Get code content of a file in project.'
  parameters = getProjectCodeParamsSchema

  constructor(private retriever: Retriever) {}

  async implementation(
    { project, file, lineStart, lineEnd }: z.infer<typeof getProjectCodeParamsSchema>,
    signal?: AbortSignal
  ) {
    const p = await this.retriever.getProject(project, signal)
    if (p.stage.codeFilePath === file) return processCode(p.stage.code, { lineStart, lineEnd })
    const sprite = p.sprites.find((s) => s.codeFilePath === file)
    if (sprite == null) throw new Error(`Code file ${file} not found in project ${project}`)
    return processCode(sprite.code, { lineStart, lineEnd })
  }
}

const getCodeDiagnosticsParamsSchema = z.object({})

class GetCodeDiagnosticsTool implements ToolDefinition {
  name = 'get_code_diagnostics'
  description = 'Get code diagnostics (errors or warnings) of current editing project.'
  parameters = getCodeDiagnosticsParamsSchema

  constructor(private codeEditorCtxRef: ComputedRef<CodeEditorCtx | undefined>) {}

  async implementation(_: z.infer<typeof getCodeDiagnosticsParamsSchema>, signal?: AbortSignal) {
    const codeEditorCtx = this.codeEditorCtxRef.value
    if (codeEditorCtx == null) throw new Error('Code editor context is not available')
    return codeEditorCtx.mustEditor().diagnosticWorkspace(signal)
  }
}

const getUINodeTextContentParamsSchema = z.object({
  targetId: z.string().describe('ID of the UI node to get content')
})

class GetUINodeTextContentTool implements ToolDefinition {
  name = 'get_ui_node_text_content'
  description = 'Get text content of a UI node by its ID.'
  parameters = getUINodeTextContentParamsSchema

  constructor(private radar: Radar) {}

  async implementation({ targetId }: z.infer<typeof getUINodeTextContentParamsSchema>) {
    const nodeInfo = this.radar.getNodeById(targetId)
    if (!nodeInfo) throw new Error(`Radar node with ID ${targetId} not found.`)
    const textContent = nodeInfo.getElement()?.textContent ?? ''
    return textContent.length > 500 ? textContent.slice(0, 500) + '...' : textContent
  }
}

class UIContextProvider implements ICopilotContextProvider {
  constructor(
    private radar: Radar,
    private i18n: I18n
  ) {}

  private serializeNode(attrs: Record<string, string>, childrenStr: string) {
    // TODO: use XMLSerializer?
    const attrsStr = Object.entries(attrs)
      .filter(([_, value]) => value != null && value !== '')
      .map(([key, value]) => `${key}="${escapeHTML(value)}"`)
      .join(' ')
    if (childrenStr.trim() === '') {
      return `<n ${attrsStr}/>`
    }
    return `<n ${attrsStr}>${childrenStr}</n>`
  }

  private stringifyNode(node: RadarNodeInfo): string {
    const childrenStr = this.stringifyNodes(node.getChildren())
    return this.serializeNode(
      {
        name: node.name,
        id: node.id,
        desc: node.desc
      },
      childrenStr
    )
  }

  private stringifyNodes(node: RadarNodeInfo[]): string {
    return node.map((n) => this.stringifyNode(n)).join('')
  }

  provideContext(): string {
    const lang =
      {
        en: 'English',
        zh: 'Chinese'
      }[this.i18n.lang.value] ?? 'Unknown'
    return `# Current UI of XBuilder

Current UI language: ${lang}.

Current UI structure (\`n\` for \`node\`):

<xbuilder>${this.stringifyNodes(this.radar.getRootNodes())}</xbuilder>

DO NOT make up appearance or position (e.g., left/right/top/bottom) of any element, unless it is explicitly mentioned in the description.

If there's an API References UI in code editor, encourage the user to insert code by dragging corresponding API items (if there is) into code editor, instead of typing manually.`
  }
}

class UserContextProvider implements ICopilotContextProvider {
  provideContext(): string {
    const signedInUsername = getSignedInUsername()
    const userInfo =
      signedInUsername != null
        ? `Now the user is signed in with name "${signedInUsername}"`
        : 'The user is not signed in'
    return `# Current user
${userInfo}`
  }
}

class LocationContextProvider implements ICopilotContextProvider {
  constructor(private router: Router) {}
  provideContext(): string {
    return `# Current location
The user is now browsing page with path: \`${this.router.currentRoute.value.fullPath}\``
  }
}
</script>

<script setup lang="ts">
const radar = useRadar()
const i18n = useI18n()
const router = useRouter()
const modalEvents = useModalEvents()
const messageEvents = useMessageEvents()
const editorCtxRef = useEditorCtxRef()
const codeEditorCtxRef = useCodeEditorCtxRef()

const retriever = new Retriever(editorCtxRef)
const copilot = new Copilot(new LocalStorageSessionStorage())

copilot.registerTool(listProjectsTool)
copilot.registerTool(new GetProjectMetadataTool(retriever))
copilot.registerTool(new GetProjectSpritesTool(retriever))
copilot.registerTool(new GetProjectCodeTool(retriever))
copilot.registerTool(new GetCodeDiagnosticsTool(codeEditorCtxRef))
copilot.registerCustomElement({
  tagName: toolUse.tagName,
  description: toolUse.detailedDescription,
  attributes: toolUse.attributes,
  isRaw: toolUse.isRaw,
  component: toolUse.default
})
copilot.registerCustomElement({
  tagName: pageLink.tagName,
  description: pageLink.detailedDescription,
  attributes: pageLink.attributes,
  isRaw: pageLink.isRaw,
  component: pageLink.default
})
copilot.registerCustomElement({
  tagName: highlightLink.tagName,
  description: highlightLink.detailedDescription,
  attributes: highlightLink.attributes,
  isRaw: highlightLink.isRaw,
  component: highlightLink.default
})
copilot.registerCustomElement({
  tagName: codeLink.tagName,
  description: codeLink.detailedDescription,
  attributes: codeLink.attributes,
  isRaw: codeLink.isRaw,
  component: codeLink.default
})
copilot.registerCustomElement({
  tagName: codeChange.tagName,
  description: codeChange.detailedDescription,
  attributes: codeChange.attributes,
  isRaw: codeChange.isRaw,
  component: codeChange.default
})
copilot.registerCustomElement({
  tagName: 'thinking',
  description: 'Custom element to wrap your thinking process.',
  attributes: z.object({}),
  isRaw: true,
  component: {
    render() {
      return null // This is a placeholder for thinking process, no actual rendering
    }
  }
})
copilot.registerTool(new GetUINodeTextContentTool(radar))
copilot.registerContextProvider(new UIContextProvider(radar, i18n))
copilot.registerContextProvider(new UserContextProvider())
copilot.registerContextProvider(new LocationContextProvider(router))

watch(
  router.currentRoute,
  debounce((route) => {
    copilot.notifyUserEvent({ en: 'Page navigation', zh: '页面切换' }, `User navigated to ${route.fullPath}`)
  }, 100)
)

onBeforeUnmount(
  modalEvents.on('open', () => {
    copilot.notifyUserEvent({ en: 'Modal opened', zh: '打开模态框' }, 'User opened a modal dialog')
  })
)
onBeforeUnmount(
  modalEvents.on('close', () => {
    copilot.notifyUserEvent({ en: 'Modal closed', zh: '关闭模态框' }, 'User closed a modal dialog')
  })
)

onBeforeUnmount(
  messageEvents.on('message', ({ type, content }) => {
    copilot.notifyUserEvent(
      { en: 'UI Notification', zh: '消息提示' },
      `A ${type} notification showed with content: ${content}`
    )
  })
)

watch(
  () => editorCtxRef.value?.state.runtime,
  (editorRuntime, _, onCleanup) => {
    if (editorRuntime == null) return
    const unlisten = editorRuntime.on('didExit', (code) => {
      if (code !== 0) return
      copilot.notifyUserEvent({ en: 'Game exited with code 0', zh: '游戏正常退出' }, `Game exited with code ${code}`)
    })
    onCleanup(unlisten)
  },
  { immediate: true }
)

provide(copilotInjectionKey, copilot)

// Handle copilot session storage
watch(
  () => copilot.currentSession?.currentRound?.resultMessages.length,
  () => copilot.saveSession()
)
onMounted(() => copilot.loadSessionFromStorage())
</script>

<template>
  <slot></slot>
</template>
